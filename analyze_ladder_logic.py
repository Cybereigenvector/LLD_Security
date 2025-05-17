import os
import sys
import subprocess
import glob
import json
import shutil
from enhanced_parser import convert_files

def create_output_directories():
    """Create the necessary output directories if they don't exist."""
    dirs = ['converted', 'analysis_results']
    for dir_name in dirs:
        os.makedirs(dir_name, exist_ok=True)
    return dirs

def run_security_analysis(input_file, output_file):
    """Run the security analyzer on the input file and save results to output file."""
    try:
        # Construct HTML file path based on current working directory
        index_html = os.path.join(os.getcwd(), "index.html")
        
        # Use a headless browser or other method to run the security analysis
        # For now, we'll simulate the analysis with a mock function
        mock_analysis_results = run_mock_analysis(input_file)
        
        # Write results to output file
        with open(output_file, 'w') as f:
            json.dump(mock_analysis_results, f, indent=2)
        
        print(f"Analysis results saved to {output_file}")
        return True
    except Exception as e:
        print(f"Error running security analysis: {e}")
        return False

def run_mock_analysis(input_file):
    """Mock function to simulate security analysis (replace with actual analyzer call)."""
    results = []
    
    # Read the simplified ladder logic file
    with open(input_file, 'r') as f:
        lines = f.readlines()
    
    # Check for common vulnerability patterns
    patterns = {
        "V-001": {"name": "Unconditional coil overwrite", "keywords": ["OTE"]},
        "V-002": {"name": "Shadow reset (seal-in loop)", "keywords": ["OTU"]},
        "V-003": {"name": "Timer bomb", "keywords": ["TON", "PRE"]},
        "V-004": {"name": "Unsafe mode override", "keywords": ["MOV 1"]},
        "V-005": {"name": "Monolithic main block", "keywords": []},  # Special case, check line count
        "V-006": {"name": "Unvalidated timer/counter preset", "keywords": ["CTU"]},
        "V-007": {"name": "Mutually-exclusive coils asserted", "keywords": ["OTE Motor_Forward", "OTE Motor_Reverse"]},
        "V-008": {"name": "HMI blind-write", "keywords": []},  # Special case, check for HMI comments
        "V-009": {"name": "Out-of-bounds indirection", "keywords": ["Array["]},
        "V-010": {"name": "Rapid toggle / missing debounce", "keywords": ["XIC", "OTE"]},
        "V-011": {"name": "Missing plausibility cross-check", "keywords": ["Sensor"]},
        "V-012": {"name": "No physical-limit clamp", "keywords": ["PID"]},
        "V-013": {"name": "Flag-blind math", "keywords": ["DIV", "ADD", "SUB"]},
        "V-014": {"name": "Alert-trap bypass", "keywords": ["OTE Alarm", "OTE System_Alarm"]}
    }
    
    # Check each pattern
    for pattern_id, pattern_info in patterns.items():
        found = False
        occurrences = 0
        snippets = []
        
        # Special case for V-005: Check for large file
        if pattern_id == "V-005":
            if len(lines) > 100:  # Simplified threshold for the mock
                found = True
                occurrences = 1
                snippets.append({
                    "lineStart": 1,
                    "lineEnd": min(10, len(lines)),
                    "code": "".join(lines[:min(10, len(lines))]) + "\n// ... (large routine)",
                    "severity": "Medium"
                })
        # Special case for V-008: Check for HMI comments
        elif pattern_id == "V-008":
            hmi_lines = [(i, line) for i, line in enumerate(lines) if "HMI" in line.upper()]
            if hmi_lines:
                found = True
                occurrences = len(hmi_lines)
                snippets = [{"lineStart": i+1, "lineEnd": i+1, "code": line, "severity": "High"} for i, line in hmi_lines]
        # Regular pattern matching
        else:
            for i, line in enumerate(lines):
                for keyword in pattern_info["keywords"]:
                    if keyword in line:
                        found = True
                        occurrences += 1
                        snippets.append({
                            "lineStart": i+1,
                            "lineEnd": i+1,
                            "code": line,
                            "severity": get_severity(pattern_id)
                        })
                        break
        
        results.append({
            "patternId": int(pattern_id.split("-")[1]),
            "code": pattern_id,
            "name": pattern_info["name"],
            "description": f"Check for {pattern_info['name']} vulnerability",
            "found": found,
            "occurrences": occurrences,
            "snippets": snippets
        })
    
    return results

def get_severity(pattern_id):
    """Get the severity level for a vulnerability pattern."""
    high_severity = ["V-001", "V-003", "V-004", "V-008", "V-013", "V-014"]
    low_severity = ["V-010"]
    
    if pattern_id in high_severity:
        return "High"
    elif pattern_id in low_severity:
        return "Low"
    else:
        return "Medium"

def generate_summary_report(analysis_results, output_file):
    """Generate a summary report of all analysis results."""
    with open(output_file, 'w') as f:
        f.write("# Ladder Logic Security Analysis Summary\n\n")
        f.write("| File | Vulnerabilities Found | High Severity | Medium Severity | Low Severity |\n")
        f.write("|------|----------------------|---------------|-----------------|-------------|\n")
        
        for file_name, results in analysis_results.items():
            if isinstance(results, list):
                found_vulns = sum(1 for r in results if r["found"])
                high = sum(1 for r in results if r["found"] and any(s["severity"] == "High" for s in r["snippets"]))
                medium = sum(1 for r in results if r["found"] and any(s["severity"] == "Medium" for s in r["snippets"]))
                low = sum(1 for r in results if r["found"] and any(s["severity"] == "Low" for s in r["snippets"]))
                
                f.write(f"| {file_name} | {found_vulns} | {high} | {medium} | {low} |\n")
        
        f.write("\n## Vulnerability Patterns\n\n")
        f.write("| ID | Name | Description |\n")
        f.write("|----|----- |-------------|\n")
        
        # Use the first file's results to get the pattern descriptions
        if analysis_results and isinstance(next(iter(analysis_results.values())), list):
            patterns = next(iter(analysis_results.values()))
            for pattern in sorted(patterns, key=lambda p: p["patternId"]):
                f.write(f"| {pattern['code']} | {pattern['name']} | {pattern['description']} |\n")

def main():
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python analyze_ladder_logic.py <input_directory>")
        return
    
    input_dir = sys.argv[1]
    
    # Create output directories
    create_output_directories()
    
    # Convert XML files to simplified text format
    print("Converting XML ladder logic files to simplified format...")
    convert_files(input_dir, "converted")
    
    # Run security analysis on each converted file
    print("\nRunning security analysis...")
    analysis_results = {}
    
    converted_files = glob.glob(os.path.join("converted", "*.txt"))
    for input_file in converted_files:
        file_name = os.path.basename(input_file)
        output_file = os.path.join("analysis_results", file_name.replace(".txt", ".json"))
        
        print(f"Analyzing {file_name}...")
        success = run_security_analysis(input_file, output_file)
        
        if success:
            with open(output_file, 'r') as f:
                analysis_results[file_name] = json.load(f)
    
    # Generate summary report
    if analysis_results:
        summary_file = os.path.join("analysis_results", "summary.md")
        generate_summary_report(analysis_results, summary_file)
        print(f"\nSummary report generated: {summary_file}")
    
    print("\nAnalysis complete!")

if __name__ == "__main__":
    main() 