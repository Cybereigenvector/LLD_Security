import os
import sys
import xml.etree.ElementTree as ET
import glob

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

def parse_ladder_rung(rung_nodes):
    """Parse a single rung of ladder logic and return a simplified text representation."""
    instructions = []
    
    for node in rung_nodes:
        if node.tag in ["contact", "coil"]:
            instruction_type = get_instruction_type(node)
            variable = extract_variable_name(node)
            instructions.append(f"{instruction_type} {variable}")
        elif node.tag in ["block", "functionBlock"]:
            instruction_type = get_instruction_type(node)
            
            # Handle parameters
            params = []
            for param in node.findall(".//variable") + node.findall(".//expression"):
                if param.text:
                    params.append(param.text)
            
            if params:
                instructions.append(f"{instruction_type} {' '.join(params)}")
            else:
                instructions.append(instruction_type)
    
    return " ".join(instructions)

def parse_xml_ladder_logic(xml_file):
    """Parse a XML ladder logic file and return a simplified representation."""
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
            # Find rungs (sets of connected elements)
            # This is a simplified approach - in a real parser we would trace connections
            
            # Group elements by their vertical position (approximation of rungs)
            elements_by_position = {}
            
            for element in ld.findall(".//*[@position]"):
                if element.tag in ["leftPowerRail", "rightPowerRail"]:
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
                rung_text = parse_ladder_rung(elements_by_position[y_pos])
                if rung_text:
                    simplified_logic.append(rung_text)
            
            # Add a comment to separate diagrams if there are multiple
            simplified_logic.append("// End of ladder diagram")
        
        return simplified_logic
    
    except Exception as e:
        print(f"Error parsing {xml_file}: {e}")
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
        
        ladder_logic = parse_xml_ladder_logic(xml_file)
        
        if ladder_logic:
            with open(output_file, "w") as f:
                f.write(f"// Converted from {filename}\n")
                f.write("\n".join(ladder_logic))
            print(f"  - Converted successfully")
        else:
            print(f"  - No ladder logic found or error occurred")

def main():
    if len(sys.argv) != 3:
        print("Usage: python ladder_logic_parser.py <input_directory> <output_directory>")
        return
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    
    convert_files(input_dir, output_dir)

if __name__ == "__main__":
    main() 