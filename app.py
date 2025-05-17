from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import tempfile
from enhanced_parser import extract_function_blocks, parse_xml_ladder_logic
import json

app = Flask(__name__, static_folder='./')
CORS(app)

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/convert-xml', methods=['POST'])
def convert_xml():
    """Convert an XML ladder logic file to text format"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not file.filename.endswith(('.xml', '.l5x')):
        return jsonify({'error': 'File must be XML or L5X format'}), 400
    
    # Save the uploaded file to a temporary location
    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, file.filename)
    file.save(temp_file_path)
    
    try:
        # Extract function block information
        fb_info = extract_function_blocks(temp_file_path)
        
        # Parse ladder logic
        ladder_logic = parse_xml_ladder_logic(temp_file_path)
        
        # Create header with function block definitions
        fb_header = []
        if fb_info:
            fb_header.append("// Function Block Definitions:")
            for fb in fb_info:
                fb_header.append(f"// FB: {fb['name']}")
                fb_header.append(f"//   Inputs: {', '.join(fb['inputs'])}")
                fb_header.append(f"//   Outputs: {', '.join(fb['outputs'])}")
            fb_header.append("//")
        
        # Combine header and ladder logic
        result = []
        result.append(f"// Converted from {file.filename}\n")
        if fb_header:
            result.extend(fb_header)
        if ladder_logic:
            result.extend(ladder_logic)
        
        # Clean up temporary files
        os.unlink(temp_file_path)
        os.rmdir(temp_dir)
        
        return jsonify({
            'converted': '\n'.join(result),
            'filename': file.filename.replace('.xml', '.txt').replace('.l5x', '.txt'),
            'success': True
        })
    
    except Exception as e:
        # Clean up temporary files
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)
        
        return jsonify({
            'error': f'Error converting file: {str(e)}',
            'success': False
        }), 500

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    app.run(debug=True, port=5000) 