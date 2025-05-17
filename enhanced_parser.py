import os
import sys
import xml.etree.ElementTree as ET
import glob
from collections import defaultdict

def extract_variable_name(node):
    """Extract variable name from a contact or coil node."""
    var_node = node.find("variable")
    if var_node is not None and var_node.text:
        return var_node.text
    
    # Try to extract from expression
    expr_node = node.find("expression")
    if expr_node is not None and expr_node.text:
        return expr_node.text
    
    return "UNKNOWN"

def get_instruction_type(node):
    """Determine the type of instruction based on the node tag."""
    tag = node.tag.lower()
    
    if tag == "contact":
        negated = node.get("negated", "false").lower() == "true"
        return "XIO" if negated else "XIC"
    elif tag == "coil":
        negated = node.get("negated", "false").lower() == "true"
        return "OTU" if negated else "OTE"
    elif tag == "block" or tag == "functionblock":
        name = node.get("typeName", "")
        if name.lower() == "ton":
            return "TON"
        elif name.lower() == "ctu":
            return "CTU"
        elif name.lower() == "mov":
            return "MOV"
        elif name.lower() == "pid":
            return "PID"
        elif name.lower() == "add":
            return "ADD"
        elif name.lower() == "sub":
            return "SUB"
        elif name.lower() == "div":
            return "DIV"
        elif name.lower() == "mul":
            return "MUL"
        elif name.lower() == "eq" or name.lower() == "equ":
            return "EQU"
        elif name.lower() == "gt" or name.lower() == "grt":
            return "GRT"
        elif name.lower() == "ge":
            return "GE"
        elif name.lower() == "lt":
            return "LT"
        elif name.lower() == "le":
            return "LE"
        elif name.lower() == "lim":
            return "LIM"
        return name.upper()
    
    return tag.upper()

def build_connection_graph(ld_node):
    """Build a graph of connected elements based on their connections."""
    # Dictionary to store connections: element_id -> [connected_element_ids]
    connections = defaultdict(list)
    
    # Dictionary to store elements by ID
    elements_by_id = {}
    
    # Find all elements with localId
    for element in ld_node.findall(".//*[@localId]"):
        local_id = element.get("localId")
        if local_id:
            elements_by_id[local_id] = element
    
    # Find all connections
    for element in ld_node.findall(".//*[@localId]"):
        local_id = element.get("localId")
        
        # Find all connectionPointOut elements
        for conn_out in element.findall(".//connectionPointOut"):
            # Find connection elements
            for conn in conn_out.findall(".//connection"):
                ref_id = conn.get("refLocalId")
                if ref_id and ref_id in elements_by_id:
                    connections[local_id].append(ref_id)
        
        # Find all connectionPointIn elements
        for conn_in in element.findall(".//connectionPointIn"):
            # Find connection elements
            for conn in conn_in.findall(".//connection"):
                ref_id = conn.get("refLocalId")
                if ref_id and ref_id in elements_by_id:
                    connections[ref_id].append(local_id)
    
    return connections, elements_by_id

def find_rungs(connections, elements_by_id):
    """Find complete rungs from left power rail to right power rail."""
    rungs = []
    
    # Find left power rails
    left_rails = [id for id, element in elements_by_id.items() 
                 if element.tag.lower() == "leftpowerrail"]
    
    # Find right power rails
    right_rails = [id for id, element in elements_by_id.items() 
                  if element.tag.lower() == "rightpowerrail"]
    
    # For each left rail, trace connections to right rail
    for left_id in left_rails:
        # Start a breadth-first search from the left rail
        visited = set()
        queue = [(left_id, [])]
        
        while queue:
            current_id, path = queue.pop(0)
            
            if current_id in visited:
                continue
            
            visited.add(current_id)
            new_path = path + [current_id]
            
            # If we reached a right rail, we found a rung
            if current_id in right_rails:
                rungs.append(new_path)
                continue
            
            # Add all connected elements to the queue
            for next_id in connections[current_id]:
                if next_id not in visited:
                    queue.append((next_id, new_path))
    
    return rungs

def extract_rung_elements(rung_path, elements_by_id):
    """Extract ladder elements from a rung path, skipping power rails."""
    elements = []
    
    for element_id in rung_path:
        element = elements_by_id[element_id]
        
        # Skip power rails
        if element.tag.lower() in ["leftpowerrail", "rightpowerrail"]:
            continue
        
        elements.append(element)
    
    return elements

def convert_rung_to_text(rung_elements):
    """Convert a list of rung elements to simplified text format."""
    instructions = []
    
    for element in rung_elements:
        if element.tag.lower() in ["contact", "coil"]:
            instruction_type = get_instruction_type(element)
            variable = extract_variable_name(element)
            instructions.append(f"{instruction_type} {variable}")
        elif element.tag.lower() in ["block", "functionblock"]:
            instruction_type = get_instruction_type(element)
            
            # Extract parameters
            params = []
            for param in element.findall(".//variable") + element.findall(".//expression"):
                if param.text:
                    params.append(param.text)
            
            if params:
                instructions.append(f"{instruction_type} {' '.join(params)}")
            else:
                instructions.append(instruction_type)
    
    return " ".join(instructions)

def parse_xml_ladder_logic(xml_file):
    """Parse a XML ladder logic file using connection tracing and return a simplified representation."""
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
        
        # Find all ladder diagrams (LD) in the file
        ld_nodes = root.findall(".//LD")
        if not ld_nodes:
            print(f"No ladder logic found in {xml_file}")
            return []
        
        simplified_logic = []
        
        # Process each ladder diagram
        for ld in ld_nodes:
            connections, elements_by_id = build_connection_graph(ld)
            rungs = find_rungs(connections, elements_by_id)
            
            # If no complete rungs found, fall back to grouping by vertical position
            if not rungs:
                # Group elements by their vertical position (approximation of rungs)
                elements_by_position = {}
                
                for element in ld.findall(".//*[@position]"):
                    if element.tag.lower() in ["leftpowerrail", "rightpowerrail"]:
                        continue
                    
                    position = element.find("position")
                    if position is not None:
                        y_pos = int(position.get("y", "0"))
                        # Group elements within a range to account for slight vertical differences
                        y_group = y_pos // 30 * 30
                        
                        if y_group not in elements_by_position:
                            elements_by_position[y_group] = []
                        
                        elements_by_position[y_group].append(element)
                
                # Process each vertical group as a rung
                for y_pos in sorted(elements_by_position.keys()):
                    rung_text = convert_rung_to_text(elements_by_position[y_pos])
                    if rung_text:
                        simplified_logic.append(rung_text)
            else:
                # Process each traced rung
                for rung_path in rungs:
                    rung_elements = extract_rung_elements(rung_path, elements_by_id)
                    rung_text = convert_rung_to_text(rung_elements)
                    if rung_text:
                        simplified_logic.append(rung_text)
            
            # Add a comment to separate diagrams if there are multiple
            simplified_logic.append("// End of ladder diagram")
        
        return simplified_logic
    
    except Exception as e:
        print(f"Error parsing {xml_file}: {e}")
        return []

def extract_function_blocks(xml_file):
    """Extract function block definitions to help with understanding custom blocks."""
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
        
        fb_info = []
        
        # Find all function block types
        pou_nodes = root.findall(".//pou[@pouType='functionBlock']")
        for pou in pou_nodes:
            name = pou.get("name", "unknown")
            
            # Extract interface information
            inputs = []
            outputs = []
            
            input_vars = pou.findall(".//inputVars/variable")
            output_vars = pou.findall(".//outputVars/variable")
            
            for var in input_vars:
                var_name = var.get("name", "")
                if var_name:
                    inputs.append(var_name)
            
            for var in output_vars:
                var_name = var.get("name", "")
                if var_name:
                    outputs.append(var_name)
            
            fb_info.append({
                "name": name,
                "inputs": inputs,
                "outputs": outputs
            })
        
        return fb_info
    
    except Exception as e:
        print(f"Error extracting function blocks from {xml_file}: {e}")
        return []

def convert_files(input_dir, output_dir):
    """Convert all XML files in input_dir to simplified format in output_dir."""
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Find all XML files in input directory
    xml_files = glob.glob(os.path.join(input_dir, "*.xml"))
    
    if not xml_files:
        print(f"No XML files found in {input_dir}")
        return
    
    for xml_file in xml_files:
        filename = os.path.basename(xml_file)
        output_file = os.path.join(output_dir, filename.replace(".xml", ".txt"))
        
        print(f"Converting {xml_file} to {output_file}...")
        
        # Extract function block information
        fb_info = extract_function_blocks(xml_file)
        
        # Add function block information to output
        fb_header = []
        if fb_info:
            fb_header.append("// Function Block Definitions:")
            for fb in fb_info:
                fb_header.append(f"// FB: {fb['name']}")
                fb_header.append(f"//   Inputs: {', '.join(fb['inputs'])}")
                fb_header.append(f"//   Outputs: {', '.join(fb['outputs'])}")
            fb_header.append("//")
        
        # Parse ladder logic
        ladder_logic = parse_xml_ladder_logic(xml_file)
        
        if ladder_logic or fb_header:
            with open(output_file, "w") as f:
                f.write(f"// Converted from {filename}\n")
                if fb_header:
                    f.write("\n".join(fb_header) + "\n")
                if ladder_logic:
                    f.write("\n".join(ladder_logic))
            print(f"  - Converted successfully")
        else:
            print(f"  - No ladder logic found or error occurred")

def main():
    if len(sys.argv) != 3:
        print("Usage: python enhanced_parser.py <input_directory> <output_directory>")
        return
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    
    convert_files(input_dir, output_dir)

if __name__ == "__main__":
    main() 