import { useState, useRef } from 'react';
import { useDocuments } from '../context/DocumentContext';

const MOCK_CURRENT_ONLY_ANSWER = `Based on the active Metro Engineering Manuals across all departments (SOP-RS-2026-Rev3 and CMRS Safety Circular 14/2025):

### 1. Key Engineering Findings & Specifications
- **Permissible Cant Deficiency**: On mainline tracks under 25 kV AC OHE traction, the standard cant deficiency is capped at **100 mm** for standard BG/SG Metro rolling stock.
- **Speed & Turnout Limitations**: For operation over curved turnouts (1 in 12 or 1 in 8.5), the maximum allowable cant deficiency shall not exceed **75 mm** unless special dispensation is issued by RDSO.
- **Inspection Protocol**: Ultrasonic flaw detection (USFD) and pantograph contact force measurements must be performed bi-weekly during monsoon conditions.
- **Interlocking & Fail-Safe Integration**: All track circuit clearance telemetry must integrate with the CBTC ATS server to enforce automatic emergency braking (EB) upon threshold violation.`;

const MOCK_ALL_VERSIONS_ANSWER = `Based on a cross-comparison of both Current Active standards and Historical Revisions across all departments:

### 1. Current Active Specification (2026 Release)
- **Current Cant Deficiency**: Strictly capped at **100 mm** for mainline 25 kV AC OHE tracks (**Pantograph_Inspection_2026_Rev3.pdf**, Section 4.2).
- **Turnout Speed Restrictions**: Reduced to **75 mm** on 1:12 turnouts to prevent excessive flange wear.

### 2. Historical & Superseded Rules (2024 Baseline)
- **Superseded Limit**: Previously allowed up to **110 mm** under older guideline (**Pantograph_Inspection_2024_Rev1.pdf**, Section 3.1). This was superseded to reduce pantograph carbon strip wear and harmonic vibration.
- **Legacy Turnout Tolerance**: Formerly permitted **85 mm** before the 2025 RDSO safety amendment.

> **Historical Audit Notice**: This query retrieved parameters across 2 active releases and 1 superseded revision for cross-department comparison.`;

const MOCK_CURRENT_SOURCES = [
  {
    docName: 'Pantograph_Inspection_2026_Rev3.pdf',
    department: 'Rolling Stock',
    version: 'v3.0',
    docStatus: 'Current',
    chunkId: 'Chunk #4 (Page 18)',
    relevance: '98.4% Match',
    icon: 'picture_as_pdf',
    iconColor: 'text-error',
    snippet: 'Clause 4.2.3: For 25kV AC overhead equipment (OHE) mainline corridors, the maximum permissible cant deficiency for broad gauge (BG) and standard gauge (SG) rolling stock shall not exceed 100mm under normal operating speeds.'
  },
  {
    docName: 'Track_Drainage_Monsoon_SOP_Rev4.pdf',
    department: 'Civil',
    version: 'v4.0',
    docStatus: 'Current',
    chunkId: 'Chunk #12 (Page 9)',
    relevance: '94.8% Match',
    icon: 'picture_as_pdf',
    iconColor: 'text-error',
    snippet: 'Table 3.1: Special speed restrictions over turnouts (1 in 12 and 1 in 8.5) mandate a reduced cant deficiency limit of 75mm during high-precipitation periods.'
  },
  {
    docName: 'CBTC_Signaling_Interlocking_Spec_2026.docx',
    department: 'Signaling',
    version: 'v2.1',
    docStatus: 'Current',
    chunkId: 'Chunk #7 (Page 34)',
    relevance: '91.2% Match',
    icon: 'description',
    iconColor: 'text-[#2B579A]',
    snippet: 'Appendix B: Automatic Train Supervision (ATS) safety profiles enforce immediate Emergency Brake (EB) triggers when cant deficiency telemetry thresholds are exceeded.'
  }
];

const MOCK_ALL_VERSIONS_SOURCES = [
  {
    docName: 'Pantograph_Inspection_2026_Rev3.pdf',
    department: 'Rolling Stock',
    version: 'v3.0',
    docStatus: 'Current',
    chunkId: 'Chunk #4 (Page 18)',
    relevance: '98.4% Match',
    icon: 'picture_as_pdf',
    iconColor: 'text-error',
    snippet: 'Clause 4.2.3 (Current): Maximum permissible cant deficiency capped at 100mm under normal operating speeds.'
  },
  {
    docName: 'Pantograph_Inspection_2024_Rev1.pdf',
    department: 'Rolling Stock',
    version: 'v1.0',
    docStatus: 'Older Version',
    chunkId: 'Chunk #2 (Page 7)',
    relevance: '95.1% Match',
    icon: 'picture_as_pdf',
    iconColor: 'text-amber-700',
    snippet: 'Clause 3.1.2 (Superseded): Permissible cant deficiency up to 110mm permitted under 2024 operational schedule.'
  },
  {
    docName: 'Track_Drainage_Monsoon_SOP_Rev4.pdf',
    department: 'Civil',
    version: 'v4.0',
    docStatus: 'Current',
    chunkId: 'Chunk #12 (Page 9)',
    relevance: '92.4% Match',
    icon: 'picture_as_pdf',
    iconColor: 'text-error',
    snippet: 'Table 3.1 (Current): Mandatory turnout cant deficiency ceiling of 75mm during monsoon maintenance cycles.'
  }
];

const DEPARTMENT_MOCK_DATA = {
  'Rolling Stock': {
    answer: `Based on active Rolling Stock Technical Standards & Maintenance Manuals (SOP-RS-2026-Rev3):

### 1. Rolling Stock Specifications & Tolerances
- **Permissible Cant Deficiency**: Strictly capped at **100 mm** for broad gauge & standard gauge metro rolling stock on mainline tracks under 25 kV AC OHE.
- **Pantograph & Traction Inspection**: Bi-weekly ultrasonic flaw detection (USFD) and carbon contact strip wear measurement.
- **Brake System Calibration**: Electro-pneumatic and regenerative braking profiles must enforce emergency deceleration threshold within **1.3 m/s²**.
- **Wheel Profile Norms**: Flange height tolerance maintained between 28 mm – 32 mm with tread wear limit of 5 mm before re-profiling on CNC wheel lathe.`,
    sources: [
      {
        docName: 'Pantograph_Inspection_2026_Rev3.pdf',
        department: 'Rolling Stock',
        version: 'v3.0',
        docStatus: 'Current',
        chunkId: 'Chunk #4 (Page 18)',
        relevance: '98.4% Match',
        icon: 'picture_as_pdf',
        iconColor: 'text-error',
        snippet: 'Clause 4.2.3: For 25kV AC overhead equipment (OHE) mainline corridors, the maximum permissible cant deficiency for broad gauge (BG) and standard gauge (SG) rolling stock shall not exceed 100mm under normal operating speeds.'
      },
      {
        docName: 'Brake_Disc_Thermal_Analysis_2025.pdf',
        department: 'Rolling Stock',
        version: 'v2.0',
        docStatus: 'Current',
        chunkId: 'Chunk #8 (Page 12)',
        relevance: '94.2% Match',
        icon: 'picture_as_pdf',
        iconColor: 'text-error',
        snippet: 'Section 6.1: Full load emergency brake tests require friction lining temperature dissipation not exceeding 380°C under continuous duty cycle.'
      }
    ]
  },
  'Signaling': {
    answer: `Based on the CBTC Signaling & Telecommunication System Specifications:

### 1. Interlocking & Fail-Safe Integration
- **CBTC ATS Server Protocol**: All track circuit clearance telemetry must integrate with the CBTC ATS server to enforce automatic emergency braking (EB) upon threshold violation.
- **Axle Counter & Zone Redundancy**: Dual-redundant fail-safe processors mandate heartbeat telemetry ping within **50 ms**.
- **Headway & Dynamic Speed Codes**: Continuous cab-signaling ATP enforces civil speed limits dynamically based on real-time track geometry.
- **Point Machine Throw**: Throwing force maintained between 450–550 kgf with stroke completion within 3.5 seconds.`,
    sources: [
      {
        docName: 'CBTC_Signaling_Interlocking_Spec_2026.docx',
        department: 'Signaling',
        version: 'v2.1',
        docStatus: 'Current',
        chunkId: 'Chunk #7 (Page 34)',
        relevance: '97.1% Match',
        icon: 'description',
        iconColor: 'text-[#2B579A]',
        snippet: 'Appendix B: Automatic Train Supervision (ATS) safety profiles enforce immediate Emergency Brake (EB) triggers when telemetry thresholds are exceeded.'
      },
      {
        docName: 'Point_Machine_Maintenance_Manual.pdf',
        department: 'Signaling',
        version: 'v1.4',
        docStatus: 'Current',
        chunkId: 'Chunk #3 (Page 15)',
        relevance: '91.8% Match',
        icon: 'picture_as_pdf',
        iconColor: 'text-error',
        snippet: 'Clause 2.4: Point machine throwing force must maintain between 450-550 kgf with stroke completion within 3.5 seconds.'
      }
    ]
  },
  'Civil': {
    answer: `Based on Civil Engineering Track & Structures Manuals:

### 1. Track Geometry & Drainage Standards
- **Cant Deficiency on Curved Turnouts**: For operation over curved turnouts (1 in 12 or 1 in 8.5), allowable cant deficiency shall not exceed **75 mm**.
- **Monsoon Track Drainage**: Cross-slope ballast gradients of 1:30 must be clear of silt, and culvert inspections performed weekly during heavy rainfall.
- **Viaduct & Pier Structural Tolerances**: Permissible differential settlement of elevated piers capped at **5 mm** over a 25-meter span.
- **Rail Joint Gap Tolerance**: Expansion gap on fishplated joints maintained within 4 mm to 8 mm at standard rail temperatures.`,
    sources: [
      {
        docName: 'Track_Drainage_Monsoon_SOP_Rev4.pdf',
        department: 'Civil',
        version: 'v4.0',
        docStatus: 'Current',
        chunkId: 'Chunk #12 (Page 9)',
        relevance: '96.8% Match',
        icon: 'picture_as_pdf',
        iconColor: 'text-error',
        snippet: 'Table 3.1: Special speed restrictions over turnouts (1 in 12 and 1 in 8.5) mandate a reduced cant deficiency limit of 75mm during high-precipitation periods.'
      },
      {
        docName: 'Viaduct_Structural_Health_Checklist.pdf',
        department: 'Civil',
        version: 'v2.0',
        docStatus: 'Current',
        chunkId: 'Chunk #5 (Page 22)',
        relevance: '93.5% Match',
        icon: 'picture_as_pdf',
        iconColor: 'text-error',
        snippet: 'Clause 5.1: Bearing displacement and expansion joint gap checks must be recorded quarterly using calibrated digital calipers.'
      }
    ]
  },
  'Procurement': {
    answer: `Based on the General Conditions of Contract (GCC) and Metro Procurement Guidelines:

### 1. Contract Terms & Vendor Compliance
- **Liquidated Damages for Delay**: Capped at **0.5% per week** of delay up to a maximum ceiling of **10%** of total contract value.
- **Performance Bank Guarantee (PBG)**: 5% of total contract value, valid through the Defect Liability Period (DLP) plus 60 days.
- **Price Variation Clause (PVC)**: Applies exclusively to contracts with execution tenure exceeding 12 months as per standard RDSO indexing.
- **Vendor Escalation Matrix**: Severity 1 delivery default triggers automatic contractual notice after 48 hours.`,
    sources: [
      {
        docName: 'GCC_Tender_Conditions_2026.pdf',
        department: 'Procurement',
        version: 'v2.0',
        docStatus: 'Current',
        chunkId: 'Chunk #9 (Page 41)',
        relevance: '96.2% Match',
        icon: 'picture_as_pdf',
        iconColor: 'text-error',
        snippet: 'Clause 17.2: Liquidated damages for delayed milestones are calculated at 0.5% per week subject to an aggregate maximum of 10% of the total contract price.'
      },
      {
        docName: 'Vendor_SLA_Escalation_Matrix.xlsx',
        department: 'Procurement',
        version: 'v1.1',
        docStatus: 'Current',
        chunkId: 'Chunk #2 (Sheet 1)',
        relevance: '90.7% Match',
        icon: 'table',
        iconColor: 'text-[#107C41]',
        snippet: 'Section 4: Severity 1 spare part supply failure initiates automatic default notice after 48 hours.'
      }
    ]
  },
  'Safety & Compliance': {
    answer: `Based on CMRS Safety Circulars and Fire Life Safety Standards:

### 1. Safety Clearances & Emergency Protocols
- **CMRS Statutory Sanction**: Comprehensive statutory documentation including rolling stock oscillation trials, USFD certificates, and signal safety cases.
- **Station Evacuation Time**: Underground stations must achieve platform clearance within **4 minutes** and complete station evacuation within **6 minutes**.
- **Tunnel Ventilation System (TVS)**: Mandates bidirectional airflow velocity of at least **2.5 m/s** in fire mode to control smoke propagation.
- **Track Intrusion Detection**: Immediate traction power tripping within 200 ms of optical obstacle detection.`,
    sources: [
      {
        docName: 'CMRS_Safety_Clearance_Checklist_2025.pdf',
        department: 'Safety & Compliance',
        version: 'v1.3',
        docStatus: 'Current',
        chunkId: 'Chunk #1 (Page 4)',
        relevance: '97.9% Match',
        icon: 'picture_as_pdf',
        iconColor: 'text-error',
        snippet: 'Item 3.2: Comprehensive fire alarm, tunnel booster fan interlocks, and emergency lighting verification required prior to revenue service sanction.'
      }
    ]
  },
  'Power & Traction': {
    answer: `Based on 25 kV AC Traction & SCADA Power Distribution SOPs:

### 1. OHE & Substation Operational Norms
- **OHE Contact Wire Stagger**: Maintained within **±200 mm** on tangent tracks and up to **±300 mm** on curved alignments.
- **Traction Substation (TSS) Protection**: Dual-redundant numerical distance protection relays must isolate earth faults within **60 ms**.
- **Minimum Contact Wire Height**: 5.00 meters in tunnels and 5.50 meters in open elevated sections.
- **SCADA Telemetry Integration**: Real-time circuit breaker status and feeder voltage telemetry over IEC 60870-5-104 protocol to the OCC.`,
    sources: [
      {
        docName: 'OHE_Traction_Maintenance_2026.pdf',
        department: 'Power & Traction',
        version: 'v3.0',
        docStatus: 'Current',
        chunkId: 'Chunk #6 (Page 14)',
        relevance: '97.3% Match',
        icon: 'picture_as_pdf',
        iconColor: 'text-error',
        snippet: 'Section 4.1: Minimum height of contact wire above rail level is 5.00 meters in tunnels and 5.50 meters in open sections.'
      }
    ]
  }
};

const DEPARTMENT_SAMPLE_PROMPTS = {
  'All': [
    'What is the maximum permissible cant deficiency for 25kV traction line?',
    'Show me the CMRS safety clearance checklist for Line 2 extension',
    'Summarize penalty clauses for signaling vendor delay under GCC Section 4.2',
    'What are the monsoon standard operating procedures for track drainage?'
  ],
  'Rolling Stock': [
    'What is the maximum permissible cant deficiency for 25kV rolling stock?',
    'Explain pantograph carbon contact strip USFD testing intervals',
    'What are the electro-pneumatic emergency braking deceleration limits?'
  ],
  'Signaling': [
    'Summarize CBTC ATS server automatic emergency braking triggers',
    'What are the point machine throwing force and stroke duration standards?',
    'Explain dual-redundant axle counter fail-safe telemetry protocols'
  ],
  'Civil': [
    'What are the monsoon standard operating procedures for track drainage?',
    'Explain permissible differential settlement for elevated metro viaduct piers',
    'What is the maximum cant deficiency over 1 in 12 curved turnouts?'
  ],
  'Procurement': [
    'Summarize penalty and liquidated damage clauses for vendor milestone delay',
    'What are the Performance Bank Guarantee (PBG) defect liability requirements?',
    'Explain Price Variation Clause (PVC) eligibility under GCC 2026'
  ],
  'Safety & Compliance': [
    'Show me the CMRS statutory safety clearance checklist for Line 2',
    'What is the mandatory underground station evacuation time ceiling?',
    'What are the tunnel ventilation airflow velocity requirements in fire mode?'
  ],
  'Power & Traction': [
    'What is the permissible contact wire stagger on tangent and curved tracks?',
    'Explain numerical distance protection relay tripping thresholds for TSS',
    'What is the minimum OHE contact wire height in underground tunnels?'
  ]
};

// Helper to format inline bold markdown **text** into clean React nodes
function renderFormattedInlineText(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// Markdown Formatter Component for rendering cleaned structured content
function FormattedAnswer({ content, isStreaming }) {
  const lines = content.split('\n');

  return (
    <div className="flex flex-col gap-2.5 text-body-md text-on-surface leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Subheading (### Title)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-body-lg font-bold text-primary mt-2 mb-1">
              {renderFormattedInlineText(trimmed.replace(/^###\s+/, ''))}
            </h4>
          );
        }

        // Callout (> Note)
        if (trimmed.startsWith('> ')) {
          return (
            <div key={idx} className="p-3.5 my-1.5 rounded-xl bg-surface border-l-4 border-secondary border border-outline-variant/40 text-on-surface-variant text-body-sm shadow-2xs">
              {renderFormattedInlineText(trimmed.replace(/^>\s+/, ''))}
            </div>
          );
        }

        // Bullet Point (- Item)
        if (trimmed.startsWith('- ')) {
          const bulletContent = trimmed.replace(/^-\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1 my-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-2"></span>
              <span className="flex-1 text-on-surface">
                {renderFormattedInlineText(bulletContent)}
              </span>
            </div>
          );
        }

        // Normal paragraph
        return (
          <p key={idx} className="text-on-surface">
            {renderFormattedInlineText(trimmed)}
          </p>
        );
      })}

      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse align-middle"></span>
      )}
    </div>
  );
}

export default function SetuSearchPage() {
  const { documents, departments } = useDocuments();
  const [query, setQuery] = useState('');
  const [thread, setThread] = useState([]);
  const [activeStreamingId, setActiveStreamingId] = useState(null);
  const [includeOlderVersions, setIncludeOlderVersions] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const inputRef = useRef(null);
  const latestMessageRef = useRef(null);

  const availableDepartments = [
    'All',
    ...(departments && departments.length > 0
      ? departments
      : ['Rolling Stock', 'Signaling', 'Civil', 'Procurement', 'Safety & Compliance', 'Power & Traction'])
  ];

  const activeSamplePrompts = DEPARTMENT_SAMPLE_PROMPTS[selectedDepartment] || DEPARTMENT_SAMPLE_PROMPTS['All'];

  const handleSearch = (searchQuery) => {
    const textToSearch = (typeof searchQuery === 'string' ? searchQuery : query).trim();
    if (!textToSearch || activeStreamingId) return;

    const newId = 'query_' + Date.now();
    const isHistorical = includeOlderVersions;

    let fullText = isHistorical ? MOCK_ALL_VERSIONS_ANSWER : MOCK_CURRENT_ONLY_ANSWER;
    let sourcesToUse = isHistorical ? MOCK_ALL_VERSIONS_SOURCES : MOCK_CURRENT_SOURCES;

    if (selectedDepartment !== 'All') {
      if (DEPARTMENT_MOCK_DATA[selectedDepartment]) {
        fullText = DEPARTMENT_MOCK_DATA[selectedDepartment].answer;
        sourcesToUse = DEPARTMENT_MOCK_DATA[selectedDepartment].sources;
        if (isHistorical) {
          fullText += `\n\n> **Department Vault Notice**: This query retrieved both active specifications and historical revision records strictly within the **${selectedDepartment}** department.`;
        }
      } else {
        // Fallback for custom added departments
        fullText = `Based on indexed technical specifications in the **${selectedDepartment}** department:\n\n### 1. Department Specifications & Findings\n- Query strictly bounded to **${selectedDepartment}** records.\n- Cross-referenced telemetry rules, statutory compliance checklists, and operating manuals for ${selectedDepartment}.\n- Telemetry threshold validation confirmed for current operating procedures.`;
        
        const matchingDocs = documents.filter(d => (d.department || '').toLowerCase() === selectedDepartment.toLowerCase());
        if (matchingDocs.length > 0) {
          sourcesToUse = matchingDocs.map((doc, idx) => ({
            docName: doc.name || doc.title,
            department: doc.department || selectedDepartment,
            version: doc.version || 'v1.0',
            docStatus: doc.docStatus || 'Current',
            chunkId: `Chunk #${idx + 1} (Page 1)`,
            relevance: `${(98 - idx * 3).toFixed(1)}% Match`,
            icon: 'description',
            iconColor: 'text-primary',
            snippet: `Found relevant operational guideline in ${doc.name} under ${selectedDepartment} documentation.`
          }));
        } else {
          sourcesToUse = [
            {
              docName: `${selectedDepartment.replace(/\s+/g, '_')}_Manual_2026.pdf`,
              department: selectedDepartment,
              version: 'v1.0',
              docStatus: 'Current',
              chunkId: 'Chunk #1 (Page 5)',
              relevance: '95.6% Match',
              icon: 'description',
              iconColor: 'text-primary',
              snippet: `Standard operating procedures and technical norms registered under ${selectedDepartment}.`
            }
          ];
        }
      }
    }

    const newEntry = {
      id: newId,
      query: textToSearch,
      answer: '',
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      sources: sourcesToUse,
      includeOlderVersions: isHistorical,
      department: selectedDepartment,
    };

    setThread(prev => [...prev, newEntry]);
    setQuery('');
    setActiveStreamingId(newId);

    // Smoothly focus on the new question & streaming answer once on submit
    setTimeout(() => {
      if (latestMessageRef.current) {
        latestMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);

    // Stream word-by-word with clean chunk updates
    let currentIndex = 0;
    const chunkSize = 8;

    const streamInterval = setInterval(() => {
      currentIndex += chunkSize;
      if (currentIndex >= fullText.length) {
        clearInterval(streamInterval);
        setThread(prev => prev.map(item => item.id === newId ? { ...item, answer: fullText, isStreaming: false } : item));
        setActiveStreamingId(null);
      } else {
        const currentText = fullText.slice(0, currentIndex);
        setThread(prev => prev.map(item => item.id === newId ? { ...item, answer: currentText } : item));
      }
    }, 18);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleClearThread = () => {
    setThread([]);
    setQuery('');
    setActiveStreamingId(null);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="flex flex-col w-full gap-6 md:gap-8 max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-display-lg font-display-lg text-on-surface">SetuSearch</h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Natural Language Semantic Search &amp; RAG Question Answering across all indexed Metro manuals.
          </p>
        </div>

        {thread.length > 0 && (
          <button
            type="button"
            onClick={handleClearThread}
            className="px-4 py-2 rounded-xl bg-surface border border-outline-variant hover:border-error/50 hover:bg-error/10 text-on-surface-variant hover:text-error text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            New Conversation
          </button>
        )}
      </div>

      {/* Hero Search Box (When Thread is Empty) */}
      {thread.length === 0 && (
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container rounded-2xl p-6 md:p-8 border border-outline-variant/40 shadow-sm flex flex-col gap-5">
            
            {/* Integrated Search Bar with Embedded Department Selector */}
            <div className="relative w-full flex items-stretch bg-surface border border-outline-variant rounded-2xl shadow-xs focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20 transition-all overflow-hidden">
              
              {/* Department Dropdown inside the search bar */}
              <div className="flex items-center shrink-0 border-r border-outline-variant/60 bg-surface-container-low/50 px-3.5 hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-secondary text-[20px] mr-2 pointer-events-none">
                  domain
                </span>
                <div className="relative flex items-center">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer pr-5 py-3 appearance-none select-none tracking-tight"
                    title="Filter search by department"
                  >
                    {availableDepartments.map((dept) => (
                      <option key={dept} value={dept} className="text-on-surface bg-surface font-medium text-xs">
                        {dept === 'All' ? 'All Departments' : dept}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
                    arrow_drop_down
                  </span>
                </div>
              </div>

              {/* Main Query Input */}
              <div className="relative flex-1 flex items-center min-w-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedDepartment === 'All'
                      ? "Ask anything across all Metro specifications, SOPs, RDSO standards..."
                      : `Ask anything in ${selectedDepartment}...`
                  }
                  className="w-full pl-4 pr-32 py-4 bg-transparent border-none text-body-md font-medium text-on-surface focus:outline-none placeholder:text-on-surface-variant/60"
                  autoFocus
                />
                
                {/* Right Action Controls */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {/* Historical Toggle */}
                  <button
                    type="button"
                    onClick={() => setIncludeOlderVersions(!includeOlderVersions)}
                    title={includeOlderVersions
                      ? "Older editions included (Click to search active only)"
                      : "Include older editions & superseded revisions in search"}
                    className={`p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                      includeOlderVersions
                        ? 'text-amber-700 bg-amber-100 ring-1 ring-amber-400'
                        : 'text-on-surface-variant hover:text-amber-700 hover:bg-amber-50/70'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      {includeOlderVersions ? 'history_toggle_off' : 'history'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    disabled={!query.trim()}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-container disabled:opacity-50 disabled:pointer-events-none text-on-primary rounded-xl font-semibold text-body-sm transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">search</span>
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Suggested Queries */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider text-[11px]">
                  Suggested Queries {selectedDepartment !== 'All' && `for ${selectedDepartment}`}
                </span>
                {selectedDepartment !== 'All' && (
                  <span className="text-[11px] text-secondary font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">filter_alt</span>
                    Scoped to {selectedDepartment}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {activeSamplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSearch(prompt)}
                    className="px-3.5 py-2 bg-surface hover:bg-surface-container-high border border-outline-variant/60 rounded-xl text-body-sm text-on-surface text-left transition-all cursor-pointer flex items-center gap-2 shadow-2xs hover:border-secondary/60 shrink-0 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">help_outline</span>
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversational Stream Thread */}
      {thread.length > 0 && (
        <div className="flex flex-col gap-6">
          {thread.map((item, idx) => (
            <div
              key={item.id}
              ref={idx === thread.length - 1 ? latestMessageRef : null}
              className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200 scroll-mt-6"
            >
              {/* User Query Bubble */}
              <div className="flex items-start justify-end gap-3">
                <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-2xl shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-1 border-b border-white/20 pb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      You
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-white/70">
                      <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border border-white/30">
                        <span className="material-symbols-outlined text-[12px]">domain</span>
                        {item.department === 'All' ? 'All Departments' : item.department}
                      </span>
                      {item.includeOlderVersions && (
                        <span className="bg-amber-400/30 text-amber-100 px-1.5 py-0.2 rounded text-[10px] font-semibold border border-amber-300/40">
                          Included Older Versions
                        </span>
                      )}
                      <span className="font-mono">{item.timestamp}</span>
                    </div>
                  </div>
                  <p className="text-body-md font-medium">{item.query}</p>
                </div>
              </div>

              {/* AI Clean Answer Card */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <span className="material-symbols-outlined text-[22px]">smart_toy</span>
                </div>

                <div className="flex-1 bg-surface-container rounded-2xl rounded-tl-sm p-6 md:p-7 border border-outline-variant/40 shadow-sm flex flex-col gap-5">
                  {/* Scope indicator banner */}
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                      <span className="text-xs font-bold text-on-surface">
                        Synthesized Answer
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface border border-outline-variant/60 text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-secondary">domain</span>
                      Scope: {item.department === 'All' ? 'Cross-Department' : item.department}
                    </span>
                  </div>

                  {/* Clean Rendered Formatted Answer */}
                  <FormattedAnswer content={item.answer} isStreaming={item.isStreaming} />

                  {/* Dedicated Retrieved Sources & Chunks Section */}
                  {item.sources && item.sources.length > 0 && !item.isStreaming && (
                    <div className="flex flex-col gap-3 pt-4 border-t border-outline-variant/50 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-label-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[17px] text-secondary">source</span>
                          Retrieved Sources &amp; Knowledge Chunks ({item.sources.length})
                        </span>
                        <span className="text-[11px] text-on-surface-variant font-medium">
                          {item.department === 'All' ? 'All indexed departments' : `${item.department} vault`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {item.sources.map((src, sIdx) => {
                          const isOlder = src.docStatus === 'Older Version';
                          return (
                            <div
                              key={sIdx}
                              className={`bg-surface rounded-xl p-3.5 border shadow-2xs transition-all flex flex-col gap-2 group ${
                                isOlder
                                  ? 'border-amber-300/70 bg-amber-50/20 hover:border-amber-400'
                                  : 'border-outline-variant/60 hover:shadow-xs'
                              }`}
                            >
                              {/* Document Header */}
                              <div className="flex items-start gap-2 min-w-0">
                                <span className={`material-symbols-outlined ${src.iconColor} text-[20px] shrink-0 mt-0.5`}>
                                  {src.icon}
                                </span>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-xs font-bold text-primary truncate" title={src.docName}>
                                      {src.docName}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-on-surface-variant mt-1">
                                    <span className="px-1.5 py-0.2 rounded font-semibold text-[9.5px] inline-flex items-center gap-0.5 bg-secondary/10 text-secondary border border-secondary/20">
                                      <span className="material-symbols-outlined text-[11px]">domain</span>
                                      {src.department}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] inline-flex items-center gap-1.5 ${
                                      isOlder
                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 min-w-[6px] min-h-[6px] aspect-square rounded-full shrink-0 ${isOlder ? 'bg-amber-600' : 'bg-emerald-600'}`}></span>
                                      <span>{isOlder ? 'Replaced' : 'Active'}</span>
                                    </span>
                                    <span className="font-mono text-secondary font-semibold">{src.chunkId}</span>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-semibold">{src.relevance}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Chunk Text Snippet */}
                              <p className="text-[11.5px] text-on-surface-variant/90 leading-snug bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/30 italic">
                                "{src.snippet}"
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Inline Bottom Search Input for Consecutive Questions */}
          <div className="w-full pt-2">
            <div className="bg-surface-container rounded-2xl p-5 md:p-6 border border-outline-variant/40 shadow-sm flex flex-col gap-4">
              
              {/* Integrated Bottom Search Bar with Embedded Department Selector */}
              <div className="relative w-full flex items-stretch bg-surface border border-outline-variant rounded-2xl shadow-xs focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20 transition-all overflow-hidden">
                
                {/* Department Dropdown inside the bottom search bar */}
                <div className="flex items-center shrink-0 border-r border-outline-variant/60 bg-surface-container-low/50 px-3 hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined text-secondary text-[18px] mr-1.5 pointer-events-none">
                    domain
                  </span>
                  <div className="relative flex items-center">
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      disabled={Boolean(activeStreamingId)}
                      className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer pr-5 py-2.5 appearance-none select-none tracking-tight"
                      title="Filter search by department"
                    >
                      {availableDepartments.map((dept) => (
                        <option key={dept} value={dept} className="text-on-surface bg-surface font-medium text-xs">
                          {dept === 'All' ? 'All Departments' : dept}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
                      arrow_drop_down
                    </span>
                  </div>
                </div>

                {/* Main Query Input */}
                <div className="relative flex-1 flex items-center min-w-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={Boolean(activeStreamingId)}
                    placeholder={
                      activeStreamingId
                        ? "Synthesizing answer..."
                        : selectedDepartment === 'All'
                          ? "Ask another question across Metro manuals (Press Enter)..."
                          : `Ask another question in ${selectedDepartment}...`
                    }
                    className="w-full pl-3.5 pr-32 py-3.5 bg-transparent border-none text-body-md font-medium text-on-surface focus:outline-none placeholder:text-on-surface-variant/60"
                    autoFocus
                  />
                  
                  {/* Right Action Controls */}
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {/* Historical Toggle */}
                    <button
                      type="button"
                      disabled={Boolean(activeStreamingId)}
                      onClick={() => setIncludeOlderVersions(!includeOlderVersions)}
                      title={includeOlderVersions
                        ? "Older editions included (Click to search active only)"
                        : "Include older editions & superseded revisions in search"}
                      className={`p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                        includeOlderVersions
                          ? 'text-amber-700 bg-amber-100 ring-1 ring-amber-400'
                          : 'text-on-surface-variant hover:text-amber-700 hover:bg-amber-50/70'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {includeOlderVersions ? 'history_toggle_off' : 'history'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSearch()}
                      disabled={!query.trim() || Boolean(activeStreamingId)}
                      className="px-5 py-2.5 bg-primary hover:bg-primary-container disabled:opacity-50 disabled:pointer-events-none text-on-primary rounded-xl font-semibold text-body-sm transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      Search
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Sample Follow-ups */}
              <div className="flex flex-col gap-2">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider text-[11px]">
                  Suggested Follow-ups {selectedDepartment !== 'All' && `for ${selectedDepartment}`}
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                  {activeSamplePrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={Boolean(activeStreamingId)}
                      onClick={() => handleSearch(prompt)}
                      className="px-3.5 py-1.5 bg-surface hover:bg-surface-container-high border border-outline-variant/60 rounded-xl text-body-sm text-on-surface text-left transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:border-secondary/60 shrink-0 whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">help_outline</span>
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
