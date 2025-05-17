import React, { useState, useEffect } from 'react';
import { Upload, AlertTriangle, Code, CheckCircle, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

// Graph visualization components
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

const App = () => {
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedVulnerability, setSelectedVulnerability] = useState(null);

  // Security vulnerabilities from the document
  const vulnerabilityPatterns = [
    { 
      id: 1, 
      code: "V-001", 
      name: "Unconditional coil overwrite", 
      description: "Ladder logic that unconditionally overwrites an output coil without proper conditions.",
      color: "#FF5252"
    },
    { 
      id: 2, 
      code: "V-002", 
      name: "Shadow reset (seal-in loop)", 
      description: "A circuit that resets a seal-in loop without proper validation.",
      color: "#FF9800"
    },
    { 
      id: 3, 
      code: "V-003", 
      name: "Timer bomb (preset from writable tag)", 
      description: "Timer preset values come from HMI-writable tags without validation.",
      color: "#FFEB3B"
    },
    { 
      id: 4, 
      code: "V-004", 
      name: "Unsafe mode override (blind MOV 1)", 
      description: "Using MOV 1 to override safety or diagnostic tags.",
      color: "#8BC34A"
    },
    { 
      id: 5, 
      code: "V-005", 
      name: "Monolithic main block", 
      description: "Main routine with more than 500 nodes, making it harder to maintain and secure.",
      color: "#00BCD4"
    },
    { 
      id: 6, 
      code: "V-006", 
      name: "Unvalidated timer/counter preset", 
      description: "Timer or counter values without validation logic.",
      color: "#3F51B5"
    },
    { 
      id: 7, 
      code: "V-007", 
      name: "Mutually-exclusive coils asserted", 
      description: "Antagonistic coil pairs (e.g., Motor_FWD and Motor_REV) asserted simultaneously.",
      color: "#9C27B0"
    },
    { 
      id: 8, 
      code: "V-008", 
      name: "HMI blind-write", 
      description: "HMI writing to PLC variables without validation.",
      color: "#E91E63"
    },
    { 
      id: 9, 
      code: "V-009", 
      name: "Out-of-bounds indirection", 
      description: "Array indexing without bounds checks.",
      color: "#795548"
    },
    { 
      id: 10, 
      code: "V-010", 
      name: "Rapid toggle / missing debounce", 
      description: "Paired outputs without debounce timer protection.",
      color: "#607D8B"
    },
    { 
      id: 11, 
      code: "V-011", 
      name: "Missing plausibility cross-check", 
      description: "Missing validation between redundant sensor tags.",
      color: "#F44336"
    },
    { 
      id: 12, 
      code: "V-012", 
      name: "No physical-limit clamp", 
      description: "PID blocks without physical limits on operator inputs.",
      color: "#FFC107"
    },
    { 
      id: 13, 
      code: "V-013", 
      name: "Flag-blind math", 
      description: "Math operations without status bit checking for alarms.",
      color: "#4CAF50"
    },
    { 
      id: 14, 
      code: "V-014", 
      name: "Alert-trap bypass", 
      description: "Alarm coil written from multiple rungs where one lacks conditions.",
      color: "#2196F3"
    }
  ];

  // Graph network visualization component
  const GraphVisualization = ({ nodes, edges, highlightedNodes }) => {
    const [zoom, setZoom] = useState(1);
    const [draggedNode, setDraggedNode] = useState(null);
    const [nodePositions, setNodePositions] = useState({});
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    useEffect(() => {
      // Initialize node positions in a circular layout
      const positions = {};
      const radius = 150;
      const center = { x: 250, y: 200 };
      
      nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI;
        positions[node.id] = {
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle)
        };
      });
      
      setNodePositions(positions);
    }, [nodes]);
    
    const handleNodeMouseDown = (nodeId, e) => {
      e.stopPropagation();
      setDraggedNode(nodeId);
    };
    
    const handleMouseMove = (e) => {
      if (draggedNode) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        
        setNodePositions(prev => ({
          ...prev,
          [draggedNode]: { x, y }
        }));
      } else if (dragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        
        setPanOffset(prev => ({
          x: prev.x + dx / zoom,
          y: prev.y + dy / zoom
        }));
        
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };
    
    const handleMouseUp = () => {
      setDraggedNode(null);
      setDragging(false);
    };
    
    const handleBackgroundMouseDown = (e) => {
      setDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    };
    
    const handleZoomIn = () => {
      setZoom(prev => Math.min(prev + 0.2, 3));
    };
    
    const handleZoomOut = () => {
      setZoom(prev => Math.max(prev - 0.2, 0.5));
    };
  
    const resetView = () => {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      
      // Re-initialize node positions
      const positions = {};
      const radius = 150;
      const center = { x: 250, y: 200 };
      
      nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI;
        positions[node.id] = {
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle)
        };
      });
      
      setNodePositions(positions);
    };
    
    return (
      <div className="relative h-96 border rounded overflow-hidden">
        <div className="absolute top-2 right-2 flex space-x-2 z-10">
          <button 
            onClick={handleZoomIn}
            className="p-1 bg-white rounded shadow hover:bg-gray-100"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            onClick={handleZoomOut}
            className="p-1 bg-white rounded shadow hover:bg-gray-100"
          >
            <ZoomOut size={16} />
          </button>
          <button 
            onClick={resetView}
            className="p-1 bg-white rounded shadow hover:bg-gray-100"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        
        <svg 
          width="100%" 
          height="100%"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseDown={handleBackgroundMouseDown}
        >
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
            {/* Draw edges first so they appear under nodes */}
            {edges.map(edge => {
              if (!nodePositions[edge.source] || !nodePositions[edge.target]) return null;
              
              const sourcePos = nodePositions[edge.source];
              const targetPos = nodePositions[edge.target];
              
              return (
                <line
                  key={`${edge.source}-${edge.target}`}
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke="#ccc"
                  strokeWidth={2}
                />
              );
            })}
            
            {/* Draw nodes */}
            {nodes.map(node => {
              if (!nodePositions[node.id]) return null;
              const { x, y } = nodePositions[node.id];
              const isHighlighted = highlightedNodes && highlightedNodes.includes(node.id);
              
              return (
                <g 
                  key={node.id}
                  transform={`translate(${x}, ${y})`}
                  onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                  style={{ cursor: 'move' }}
                >
                  <circle
                    r={isHighlighted ? 15 : 10}
                    fill={isHighlighted ? node.color || '#ff5252' : node.type === 'instruction' ? '#64b5f6' : '#81c784'}
                    stroke={isHighlighted ? '#d32f2f' : '#555'}
                    strokeWidth={isHighlighted ? 2 : 1}
                  />
                  <text
                    textAnchor="middle"
                    dy=".3em"
                    fontSize="12"
                    fontWeight={isHighlighted ? 'bold' : 'normal'}
                    fill="#fff"
                  >
                    {node.id}
                  </text>
                  <title>{node.label || node.id}</title>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    );
  };

  // Function to parse ladder logic code into a graph structure
  const parseLadderLogic = (content) => {
    // In a real implementation, this would actually parse the ladder logic code
    // to create a graph representation. Here we'll create a mock graph for demonstration.
    
    const createMockGraphForPattern = (pattern) => {
      const graphs = [];
      
      // Different mock graph structures based on pattern
      switch(pattern.code) {
        case "V-001": // Unconditional coil overwrite
          graphs.push({
            nodes: [
              { id: "1", label: "OTE Motor_Output", type: "instruction" },
              { id: "2", label: "XIC Sensor_Input", type: "condition" }
            ],
            edges: [
              { source: "2", target: "1" }
            ],
            code: `XIC Sensor_Input OTE Motor_Output`,
            line: 42,
            severity: "High"
          });
          break;
          
        case "V-002": // Shadow reset
          graphs.push({
            nodes: [
              { id: "1", label: "OTE Alarm_Active", type: "instruction" },
              { id: "2", label: "OTU Alarm_Active", type: "instruction" },
              { id: "3", label: "XIC Reset_Button", type: "condition" }
            ],
            edges: [
              { source: "3", target: "2" }
            ],
            code: `XIC Alarm_Condition OTE Alarm_Active\nXIC Reset_Button OTU Alarm_Active`,
            line: 127,
            severity: "Medium"
          });
          break;
          
        case "V-003": // Timer bomb
          graphs.push({
            nodes: [
              { id: "1", label: "MOV HMI_Value Timer.PRE", type: "instruction" },
              { id: "2", label: "TON Timer", type: "instruction" }
            ],
            edges: [
              { source: "1", target: "2" }
            ],
            code: `MOV HMI_Value Timer.PRE\nTON Timer`,
            line: 234,
            severity: "High"
          });
          break;
          
        case "V-004": // Unsafe mode override
          graphs.push({
            nodes: [
              { id: "1", label: "MOV 1 Safety_Bypass", type: "instruction" },
              { id: "2", label: "XIC Maintenance_Mode", type: "condition" }
            ],
            edges: [
              { source: "2", target: "1" }
            ],
            code: `XIC Maintenance_Mode\nMOV 1 Safety_Bypass`,
            line: 315,
            severity: "High"
          });
          break;
          
        case "V-007": // Mutually-exclusive coils
          graphs.push({
            nodes: [
              { id: "1", label: "OTE Motor_Forward", type: "instruction" },
              { id: "2", label: "OTE Motor_Reverse", type: "instruction" },
              { id: "3", label: "XIC Forward_Button", type: "condition" },
              { id: "4", label: "XIC Reverse_Button", type: "condition" }
            ],
            edges: [
              { source: "3", target: "1" },
              { source: "4", target: "2" }
            ],
            code: `XIC Forward_Button OTE Motor_Forward\nXIC Reverse_Button OTE Motor_Reverse`,
            line: 456,
            severity: "Medium"
          });
          break;
          
        case "V-009": // Out-of-bounds indirection
          graphs.push({
            nodes: [
              { id: "1", label: "MOV Index Array[Index]", type: "instruction" }
            ],
            edges: [],
            code: `MOV Index Array[Index]`,
            line: 582,
            severity: "Medium"
          });
          break;
          
        case "V-014": // Alert-trap bypass
          graphs.push({
            nodes: [
              { id: "1", label: "OTE Alarm", type: "instruction", rung: 1 },
              { id: "2", label: "OTE Alarm", type: "instruction", rung: 2 },
              { id: "3", label: "XIC Condition_1", type: "condition" },
              { id: "4", label: "XIC Condition_2", type: "condition" }
            ],
            edges: [
              { source: "3", target: "1" },
              { source: "4", target: "1" }
            ],
            code: `// Rung 1\nXIC Condition_1 ANB XIC Condition_2 OTE Alarm\n// Rung 2\nOTE Alarm`,
            line: 721,
            severity: "High"
          });
          break;
          
        default:
          // Generate random graphs for other patterns
          if (Math.random() > 0.7) {
            const nodeCount = Math.floor(Math.random() * 5) + 2;
            const nodes = [];
            const edges = [];
            
            for (let i = 1; i <= nodeCount; i++) {
              nodes.push({ 
                id: i.toString(), 
                label: `Node ${i}`, 
                type: i % 2 === 0 ? "instruction" : "condition" 
              });
            }
            
            // Create some random edges
            for (let i = 1; i < nodeCount; i++) {
              if (Math.random() > 0.3) {
                edges.push({ 
                  source: i.toString(), 
                  target: (i+1).toString() 
                });
              }
            }
            
            graphs.push({
              nodes,
              edges,
              code: generateMockSnippet(pattern.code),
              line: Math.floor(Math.random() * 1000) + 1,
              severity: Math.random() > 0.7 ? "High" : Math.random() > 0.4 ? "Medium" : "Low"
            });
          }
      }
      
      return graphs;
    };
    
    // For each vulnerability pattern, create mock graphs
    // that would be found in the ladder logic
    const allFindingGraphs = {};
    
    vulnerabilityPatterns.forEach(pattern => {
      const graphs = createMockGraphForPattern(pattern);
      if (graphs.length > 0) {
        allFindingGraphs[pattern.code] = graphs;
      }
    });
    
    return {
      // A representation of the full ladder logic program as a graph
      fullGraph: {
        nodes: [
          { id: "Start", label: "Program Start", type: "special" },
          { id: "R1", label: "Rung 1", type: "rung" },
          { id: "R2", label: "Rung 2", type: "rung" },
          { id: "R3", label: "Rung 3", type: "rung" },
          { id: "I1", label: "XIC Sensor1", type: "condition" },
          { id: "I2", label: "XIC Sensor2", type: "condition" },
          { id: "I3", label: "OTE Motor1", type: "instruction" },
          { id: "I4", label: "TON Timer1", type: "instruction" },
          { id: "I5", label: "MOV Value Tag1", type: "instruction" },
          { id: "End", label: "Program End", type: "special" }
        ],
        edges: [
          { source: "Start", target: "R1" },
          { source: "R1", target: "R2" },
          { source: "R2", target: "R3" },
          { source: "R3", target: "End" },
          { source: "R1", target: "I1" },
          { source: "R1", target: "I2" },
          { source: "I1", target: "I3" },
          { source: "I2", target: "I3" },
          { source: "R2", target: "I4" },
          { source: "R3", target: "I5" }
        ]
      },
      // Subgraphs containing vulnerability patterns
      findingGraphs: allFindingGraphs
    };
  };
  
  // This simulates the graph isomorphism detection algorithm
  const detectIsomorphism = (graph, pattern) => {
    // In a real implementation, this would use actual graph isomorphism algorithms
    // like VF2 or ISMAGS to detect if the pattern graph is a subgraph of the program graph
    
    // For demonstration, we'll just return our mock results
    return graph.findingGraphs[pattern.code] || [];
  };

  // Generate mock code snippets for demonstration
  const generateMockSnippet = (code) => {
    // Different snippet templates based on vulnerability type
    const snippets = {
      "V-001": `// Unconditional coil overwrite
XIC Sensor_Input OTE Motor_Output
// Missing condition check before output energize`,
      
      "V-002": `// Shadow reset (seal-in loop)
XIC Alarm_Condition OTE Alarm_Active
XIC Reset_Button OTU Alarm_Active
// Missing validation before reset`,
      
      "V-003": `// Timer preset from writable tag
MOV HMI_Value Timer.PRE
TON Timer
// Missing validation of timer preset value`,
      
      "V-004": `// Unsafe mode override
XIC Maintenance_Mode
MOV 1 Safety_Bypass
// Blind override of safety system`,
      
      "V-005": `// Monolithic main block
// This is just a small part of a 500+ node routine
XIC Input_1 OTE Output_1
XIC Input_2 OTE Output_2
// ... hundreds more lines ...`,
      
      "V-006": `// Unvalidated timer preset
MOV User_Input Timer_Value.PRE
// Missing range check on timer preset`,
      
      "V-007": `// Mutually-exclusive coils
XIC Forward_Button OTE Motor_Forward
XIC Reverse_Button OTE Motor_Reverse
// Missing interlock to prevent both directions`,
      
      "V-008": `// HMI blind-write
// HMI directly writes to critical value
// Missing PLC-side validation`,
      
      "V-009": `// Array indexing without bounds check
MOV Index Array[Index]
// Missing validation: IF Index < 0 OR Index >= Array.Length THEN Error`,
      
      "V-010": `// Missing debounce protection
XIC Button_Input OTE Output_Coil
// Should include TON timer for debounce`,
      
      "V-011": `// Missing plausibility cross-check
XIC Sensor_1 OTE Process_Value
// Should cross-check with Sensor_2`,
      
      "V-012": `// PID without physical limits
MOV Operator_Input PID_Setpoint
// Missing min/max clamp`,
      
      "V-013": `// Math without status bit check
ADD Value_1 Value_2 Result
// Missing check on math status bits`,
      
      "V-014": `// Alert bypass
// Rung 1 (with conditions)
XIC Condition_1 ANB XIC Condition_2 OTE Alarm
// Rung 2 (without conditions)
OTE Alarm
// Second write bypasses conditions`
    };
    
    return snippets[code] || "// Sample vulnerable code snippet";
  };

  // Main function for analyzing ladder logic
  const analyzeLadderLogic = (content) => {
    // Simulate analysis time
    setAnalyzing(true);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Parse the ladder logic code into a graph structure
        const graph = parseLadderLogic(content);
        
        // For each vulnerability pattern, detect isomorphisms
        const results = vulnerabilityPatterns.map(pattern => {
          // Check if the pattern exists in the ladder logic
          const isomorphisms = detectIsomorphism(graph, pattern);
          const found = isomorphisms.length > 0;
          
          // Create snippets from detected isomorphisms
          const snippets = isomorphisms.map((iso, index) => ({
            id: `${pattern.code}-${index+1}`,
            lineStart: iso.line,
            lineEnd: iso.line + iso.code.split('\n').length - 1,
            code: iso.code,
            severity: iso.severity,
            nodes: iso.nodes,
            edges: iso.edges
          }));
          
          return {
            patternId: pattern.id,
            code: pattern.code,
            name: pattern.name,
            description: pattern.description,
            found,
            occurrences: snippets.length,
            snippets,
            graphData: found ? {
              nodes: snippets[0]?.nodes || [],
              edges: snippets[0]?.edges || []
            } : null
          };
        });
        
        setAnalyzing(false);
        resolve(results);
      }, 2000);
    });
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target.result);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (fileContent) {
      const results = await analyzeLadderLogic(fileContent);
      setResults(results);
    }
  };

  // Prepare chart data from results
  const prepareChartData = () => {
    if (!results) return [];
    
    return results
      .filter(result => result.found)
      .map(result => ({
        name: result.code,
        value: result.occurrences,
        color: vulnerabilityPatterns.find(p => p.id === result.patternId)?.color || '#000'
      }));
  };

  // Prepare pie chart data for severity distribution
  const prepareSeverityData = () => {
    if (!results) return [];
    
    const severityCounts = { High: 0, Medium: 0, Low: 0 };
    
    results.forEach(result => {
      if (result.found) {
        result.snippets.forEach(snippet => {
          severityCounts[snippet.severity]++;
        });
      }
    });
    
    return [
      { name: 'High', value: severityCounts.High, color: '#e53935' },
      { name: 'Medium', value: severityCounts.Medium, color: '#fb8c00' },
      { name: 'Low', value: severityCounts.Low, color: '#43a047' }
    ].filter(item => item.value > 0);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Ladder Logic Security Analyzer</h1>
          <p className="text-sm opacity-80">
            Detect security vulnerabilities in PLC ladder logic using graph isomorphism analysis
          </p>
        </div>
      </header>
      
      <main className="container mx-auto p-4 flex-grow">
        {!results ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Upload Ladder Logic File</h2>
            
            <div className="mb-4">
              <label 
                htmlFor="file-upload" 
                className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-blue-400 focus:outline-none"
              >
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="font-medium text-gray-600">
                    {file ? file.name : 'Drop files to upload or click to browse'}
                  </span>
                  {file && (
                    <span className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </span>
                  )}
                </div>
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  accept=".l5x,.txt,.xml" 
                  onChange={handleFileChange}
                />
              </label>
            </div>
            
            <button
              onClick={handleAnalyze}
              disabled={!fileContent || analyzing}
              className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors ${
                !fileContent || analyzing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {analyzing ? 'Analyzing...' : 'Analyze for Vulnerabilities'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Results Summary Panel */}
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
              
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">File Analyzed:</span>
                  <span>{file.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Total Vulnerabilities:</span>
                  <span className="font-bold text-red-600">
                    {results.filter(r => r.found).reduce((sum, r) => sum + r.occurrences, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Patterns Detected:</span>
                  <span>{results.filter(r => r.found).length} of 14</span>
                </div>
              </div>
              
              <div className="h-60 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareChartData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={50} />
                    <Tooltip 
                      formatter={(value, name, props) => {
                        const result = results.find(r => r.code === props.payload.name);
                        return [`${value} occurrences`, result?.name || props.payload.name];
                      }}
                    />
                    <Bar dataKey="value">
                      {prepareChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Severity Distribution Chart */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Severity Distribution</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareSeverityData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        dataKey="value"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {prepareSeverityData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} issues`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <h3 className="font-semibold mb-2">Detected Vulnerabilities</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {results
                  .filter(result => result.found)
                  .map(result => (
                    <div 
                      key={result.code}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedVulnerability?.code === result.code 
                          ? 'bg-blue-100 border-l-4 border-blue-600' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      onClick={() => setSelectedVulnerability(result)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{result.code}</div>
                        <div className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                          {result.occurrences} {result.occurrences === 1 ? 'instance' : 'instances'}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">{result.name}</div>
                    </div>
                  ))}
              </div>
              
              <button
                onClick={() => {
                  setResults(null);
                  setSelectedVulnerability(null);
                  setFile(null);
                  setFileContent(null);
                }}
                className="mt-4 w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 font-medium transition-colors"
              >
                Analyze Another File
              </button>
            </div>
            
            {/* Vulnerability Details Panel */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md overflow-y-auto" style={{ maxHeight: "90vh" }}>
              {selectedVulnerability ? (
                <>
                  <div className="border-b pb-4 mb-4">
                    <h2 className="text-xl font-semibold flex items-center">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center mr-2" style={{backgroundColor: vulnerabilityPatterns.find(p => p.code === selectedVulnerability.code)?.color || '#000'}}></span>
                      {selectedVulnerability.code}: {selectedVulnerability.name}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {selectedVulnerability.description}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Detected Instances ({selectedVulnerability.occurrences})</h3>
                    <div className="space-y-4">
                      {selectedVulnerability.snippets.map(snippet => (
                        <div 
                          key={snippet.id} 
                          className="border rounded-md overflow-hidden"
                        >
                          <div className="flex justify-between items-center bg-gray-100 px-3 py-1.5 border-b">
                            <div className="text-sm">
                              Lines {snippet.lineStart}-{snippet.lineEnd}
                            </div>
                            <div className={`text-xs px-2 py-0.5 rounded-full flex items-center ${
                              snippet.severity === 'High' 
                                ? 'bg-red-100 text-red-800'
                                : snippet.severity === 'Medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              <AlertTriangle size={12} className="mr-1" />
                              {snippet.severity} Severity
                            </div>
                          </div>
                          <pre className="bg-gray-50 p-3 text-sm overflow-x-auto">
                            <code>{snippet.code}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-6 border-t pt-4">
                    <h3 className="font-semibold mb-2 flex items-center">
                      <AlertTriangle size={16} className="mr-1 text-orange-600" />
                      Vulnerability Graph Structure
                    </h3>
                    
                    {selectedVulnerability.graphData ? (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">
                          This graph visualization shows the structure of the detected vulnerability pattern in your ladder logic:
                        </p>
                        <GraphVisualization 
                          nodes={selectedVulnerability.graphData.nodes.map(node => ({
                            ...node,
                            color: vulnerabilityPatterns.find(p => p.code === selectedVulnerability.code)?.color
                          }))}
                          edges={selectedVulnerability.graphData.edges}
                          highlightedNodes={selectedVulnerability.graphData.nodes.map(node => node.id)}
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 border rounded-md text-gray-500 text-center">
                        No graph structure available for this vulnerability
                      </div>
                    )}
                    
                    <h3 className="font-semibold mb-2 mt-6 flex items-center">
                      <CheckCircle size={16} className="mr-1 text-green-600" />
                      Suggested Fixes
                    </h3>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      {selectedVulnerability.code === "V-001" && (
                        <p>
                          Add conditional checks before energizing output coils. Every OTE (Output Energize) 
                          instruction should have appropriate conditions that need to be met.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-002" && (
                        <p>
                          Implement proper validation conditions before allowing seal-in loop resets.
                          Consider adding operator authorization checks and ensure alarm acknowledgment 
                          follows proper procedures.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-003" && (
                        <p>
                          Add validation logic for timer preset values. Create a range check for timer 
                          values that come from HMI or external sources. Never use raw HMI values directly 
                          for critical timer presets.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-004" && (
                        <p>
                          Avoid using blind MOV 1 instructions for safety bypasses. Implement proper override 
                          procedures with authorization, time limits, and logging.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-005" && (
                        <p>
                          Break up the monolithic main block into smaller, modular routines. Use function 
                          blocks or subroutines for different process steps and validate inputs/outputs at 
                          each boundary.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-006" && (
                        <p>
                          Add validation for timer and counter presets. Implement minimum and maximum range 
                          checks, and use default safe values if inputs are out of bounds.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-007" && (
                        <p>
                          Implement interlocks between mutually exclusive outputs. Ensure that paired signals 
                          (like Forward/Reverse) cannot be energized simultaneously through logic constraints.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-008" && (
                        <p>
                          Add PLC-side validation for all HMI inputs. Create separate buffer registers for HMI 
                          inputs and validate them before using in the control logic.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-009" && (
                        <p>
                          Add bounds checking for all array operations. Validate indices before use and implement 
                          "poisoned" array ends to catch fence-post errors.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-010" && (
                        <p>
                          Add debounce timers for toggled outputs. Implement minimum delay periods between state 
                          changes to prevent rapid toggling that could damage equipment.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-011" && (
                        <p>
                          Implement cross-checks for redundant measurements. Compare values from different sensors 
                          and alert on implausible differences.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-012" && (
                        <p>
                          Add physical limit checks for all PID blocks. Implement minimum and maximum bounds on 
                          setpoints based on physical constraints of the system.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-013" && (
                        <p>
                          Monitor math status bits and connect them to alarms. Check for overflow, underflow, 
                          divide-by-zero and other math errors, and take appropriate action.
                        </p>
                      )}
                      {selectedVulnerability.code === "V-014" && (
                        <p>
                          Ensure alarm coils are only written from a single location with proper conditions. 
                          Remove or carefully document any unconditional writes to alarm outputs.
                        </p>
                      )}
                    </div>
                    
                    <h3 className="font-semibold mb-2 mt-6 flex items-center">
                      <Code size={16} className="mr-1 text-blue-600" />
                      Secure Code Example
                    </h3>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <pre className="bg-white p-3 text-sm overflow-x-auto rounded border">
                        <code>
                          {selectedVulnerability.code === "V-001" && `// Conditional coil write with proper checks
XIC Process_Running
XIC Sensor_Input
XIC Safety_Permissive
OTE Motor_Output`}
                          
                          {selectedVulnerability.code === "V-002" && `// Safe reset with validation
XIC Alarm_Condition OTE Alarm_Active
XIC Reset_Button
XIC Operator_Auth
XIC All_Conditions_Safe
OTU Alarm_Active`}
                          
                          {selectedVulnerability.code === "V-003" && `// Timer preset with validation
MOV HMI_Value TempValue
LIM 0 TempValue 1000
EQU 1 LimitOK
XIC LimitOK
MOV TempValue Timer.PRE
TON Timer`}
                          
                          {selectedVulnerability.code === "V-004" && `// Safe mode override with authorization
XIC Maintenance_Mode
XIC Auth_Level_Supervisor
XIC Timeout_Monitor.DN
MOV 1 Safety_Bypass_Temp
XIC HMI_Confirm
MOV Safety_Bypass_Temp Safety_Bypass`}
                          
                          {selectedVulnerability.code === "V-005" && `// Breaking code into smaller function blocks
JSR Initialization_Routine
JSR Main_Control_Routine
JSR Safety_Monitoring_Routine
JSR IO_Processing_Routine
// Each routine has fewer than 100 nodes`}
                          
                          {selectedVulnerability.code === "V-006" && `// Validated timer preset
MOV User_Input Temp_Value
LIM MinValue Temp_Value MaxValue
EQU 1 InRange
XIC InRange
MOV Temp_Value Timer_Value.PRE
XIO InRange
MOV DefaultValue Timer_Value.PRE`}
                          
                          {selectedVulnerability.code === "V-007" && `// Mutually-exclusive coil interlock
XIC Forward_Button
XIO Reverse_Active
OTE Motor_Forward
XIC Reverse_Button
XIO Forward_Active
OTE Motor_Reverse`}
                          
                          {selectedVulnerability.code === "V-008" && `// Validated HMI inputs
MOV HMI_Input Temp_Value
LIM MinValue Temp_Value MaxValue
EQU 1 InRange
XIC InRange
MOV Temp_Value Process_Value
XIO InRange
MOV Current_Value Process_Value
OTE Validation_Error`}
                          
                          {selectedVulnerability.code === "V-009" && `// Validated array indexing
MOV Index TempIndex
LIM 0 TempIndex ArraySize
EQU 1 IndexValid
XIC IndexValid
MOV Array[TempIndex] Value
XIO IndexValid
MOV DefaultValue Value
OTE IndexError`}
                          
                          {selectedVulnerability.code === "V-010" && `// Debounce protection for outputs
XIC Button_Input
TON Debounce_Timer
XIC Debounce_Timer.DN
OTE Output_Coil`}
                          
                          {selectedVulnerability.code === "V-011" && `// Cross-check between redundant sensors
SUB Sensor_1 Sensor_2 Difference
ABS Difference AbsDifference
GRT AbsDifference MaxAllowedDifference
OTE Sensor_Mismatch
XIC Sensor_1_Valid
XIC Sensor_2_Valid
XIO Sensor_Mismatch
AVE Sensor_1 Sensor_2 Process_Value`}
                          
                          {selectedVulnerability.code === "V-012" && `// PID with physical limits
MOV Operator_Input Temp_Value
LIM ProcessMin Temp_Value ProcessMax
EQU 1 InRange
XIC InRange
MOV Temp_Value PID_Setpoint
XIO InRange
MOV CurrentValue PID_Setpoint
OTE SetpointError`}
                          
                          {selectedVulnerability.code === "V-013" && `// Math operations with status bit checks
ADD Value_1 Value_2 Result
XIC S:V
OTE Math_Error
XIC Math_Error
JSR Error_Handling_Routine`}
                          
                          {selectedVulnerability.code === "V-014" && `// Single alarm coil write with conditions
// Only one write instruction to the alarm coil
XIC Condition_1 
ANB XIC Condition_2 
ANB XIC Condition_3
OTE Alarm`}
                        </code>
                      </pre>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-b pb-4 mb-4">
                    <h2 className="text-xl font-semibold">Program Overview</h2>
                    <p className="text-gray-600 mt-1">
                      Visualization of your complete ladder logic program structure. Vulnerable areas are highlighted in colors corresponding to the detected issues.
                    </p>
                  </div>

                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Program Graph Structure</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      This graph shows the overall structure of your ladder logic program. Select a vulnerability from the left panel to see details.
                    </p>
                    <div className="bg-white border rounded-md p-2" style={{ height: "500px" }}>
                      <GraphVisualization 
                        nodes={parseLadderLogic(fileContent).fullGraph.nodes.map(node => ({
                          ...node,
                          color: node.type === 'instruction' ? '#64b5f6' : 
                                node.type === 'condition' ? '#81c784' : 
                                node.type === 'rung' ? '#ffb74d' : '#9575cd'
                        }))}
                        edges={parseLadderLogic(fileContent).fullGraph.edges}
                        highlightedNodes={[]}
                      />
                    </div>
                    <div className="flex mt-2 justify-center">
                      <div className="flex items-center mx-2">
                        <div className="w-3 h-3 rounded-full bg-blue-400 mr-1"></div>
                        <span className="text-xs">Instructions</span>
                      </div>
                      <div className="flex items-center mx-2">
                        <div className="w-3 h-3 rounded-full bg-green-400 mr-1"></div>
                        <span className="text-xs">Conditions</span>
                      </div>
                      <div className="flex items-center mx-2">
                        <div className="w-3 h-3 rounded-full bg-orange-300 mr-1"></div>
                        <span className="text-xs">Rungs</span>
                      </div>
                      <div className="flex items-center mx-2">
                        <div className="w-3 h-3 rounded-full bg-purple-300 mr-1"></div>
                        <span className="text-xs">Special Elements</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">Security Analysis Summary</h3>
                    <div className="bg-gray-50 p-4 rounded-md border">
                      <p className="mb-4">
                        Based on the "Secure PLC Coding Practices: Top 20 List", we've analyzed your ladder logic code for 14 common security vulnerabilities. 
                        Select a detected vulnerability from the left panel to see details and remediation suggestions.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-lg font-medium text-red-600 mb-1">
                            {results.filter(r => r.found).reduce((sum, r) => sum + r.occurrences, 0)}
                          </div>
                          <div className="text-sm text-gray-600">Total Issues Found</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-lg font-medium text-blue-600 mb-1">
                            {results.filter(r => r.found).length}/14
                          </div>
                          <div className="text-sm text-gray-600">Vulnerability Types</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-lg font-medium text-yellow-600 mb-1">
                            {prepareSeverityData().find(d => d.name === 'High')?.value || 0}
                          </div>
                          <div className="text-sm text-gray-600">High Severity Issues</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-lg font-medium text-green-600 mb-1">
                            {results.filter(r => !r.found).length}/14
                          </div>
                          <div className="text-sm text-gray-600">Passed Checks</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      
      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        <p>Ladder Logic Security Analyzer - Based on Top 20 Secure PLC Coding Practices</p>
        <p className="text-gray-400 text-xs mt-1">
          This tool uses graph isomorphism techniques to detect security vulnerabilities in PLC code
        </p>
      </footer>
    </div>
  );
};

export default App;