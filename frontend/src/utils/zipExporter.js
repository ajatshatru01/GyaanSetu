/**
 * GyanSetu Client-Side Document Vault ZIP Archive Exporter
 * Creates standard PKWARE ZIP files with UTF-8 filenames, manifest CSV, lineage JSON, and organized document tree.
 * Fully compatible with Windows Explorer, macOS Finder, 7-Zip, and Linux Archive Manager.
 */

// CRC-32 Lookup Table & Calculator
function createCrc32Table() {
  let c;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC32_TABLE = createCrc32Table();

function calculateCrc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Convert string to UTF-8 bytes
function strToUtf8(str) {
  return new TextEncoder().encode(str);
}

// Convert Date to MS-DOS Date/Time format
function getDosDateTime(date = new Date()) {
  const d = new Date(date);
  const time = ((d.getHours() & 0x1F) << 11) | ((d.getMinutes() & 0x3F) << 5) | ((d.getSeconds() >> 1) & 0x1F);
  const dosDate = (((d.getFullYear() - 1980) & 0x7F) << 9) | (((d.getMonth() + 1) & 0xF) << 5) | (d.getDate() & 0x1F);
  return { time, dosDate };
}

// Simple In-Memory ZIP File Builder (Zero external dependency)
export class SimpleZipBuilder {
  constructor() {
    this.files = [];
  }

  addFile(path, content) {
    let bytes;
    if (typeof content === 'string') {
      bytes = strToUtf8(content);
    } else if (content instanceof Uint8Array) {
      bytes = content;
    } else {
      bytes = strToUtf8(JSON.stringify(content, null, 2));
    }

    const pathBytes = strToUtf8(path.replace(/\\/g, '/'));
    const crc = calculateCrc32(bytes);
    const { time, dosDate } = getDosDateTime();

    this.files.push({
      path,
      pathBytes,
      bytes,
      crc,
      time,
      dosDate,
      size: bytes.length,
    });
  }

  buildBlob() {
    const localHeaders = [];
    const centralHeaders = [];
    let localOffset = 0;

    // 1. Build Local File Entries
    for (const file of this.files) {
      const localHeader = new Uint8Array(30 + file.pathBytes.length + file.size);
      const view = new DataView(localHeader.buffer);

      // Signature: 0x04034b50 (PK\x03\x04)
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true); // Version needed: 2.0
      view.setUint16(6, 0x0800, true); // General purpose flag: UTF-8
      view.setUint16(8, 0, true); // Compression: Store (0)
      view.setUint16(10, file.time, true);
      view.setUint16(12, file.dosDate, true);
      view.setUint32(14, file.crc, true);
      view.setUint32(18, file.size, true); // Compressed size
      view.setUint32(22, file.size, true); // Uncompressed size
      view.setUint16(26, file.pathBytes.length, true);
      view.setUint16(28, 0, true); // Extra field length

      // Copy filename & content
      localHeader.set(file.pathBytes, 30);
      localHeader.set(file.bytes, 30 + file.pathBytes.length);

      localHeaders.push({
        bytes: localHeader,
        offset: localOffset,
        file,
      });

      localOffset += localHeader.length;
    }

    // 2. Build Central Directory
    let centralDirSize = 0;
    for (const item of localHeaders) {
      const { file, offset } = item;
      const cdHeader = new Uint8Array(46 + file.pathBytes.length);
      const view = new DataView(cdHeader.buffer);

      // Signature: 0x02014b50 (PK\x01\x02)
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true); // Version made by
      view.setUint16(6, 20, true); // Version needed
      view.setUint16(8, 0x0800, true); // Flags (UTF-8)
      view.setUint16(10, 0, true); // Compression: Store
      view.setUint16(12, file.time, true);
      view.setUint16(14, file.dosDate, true);
      view.setUint32(16, file.crc, true);
      view.setUint32(20, file.size, true);
      view.setUint32(24, file.size, true);
      view.setUint16(28, file.pathBytes.length, true);
      view.setUint16(30, 0, true); // Extra field len
      view.setUint16(32, 0, true); // Comment len
      view.setUint16(34, 0, true); // Disk start
      view.setUint16(36, 0, true); // Internal file attrs
      view.setUint32(38, 0, true); // External file attrs
      view.setUint32(42, offset, true); // Relative offset of local header

      cdHeader.set(file.pathBytes, 46);
      centralHeaders.push(cdHeader);
      centralDirSize += cdHeader.length;
    }

    // 3. Build End of Central Directory (EOCD)
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true); // PK\x05\x06
    eocdView.setUint16(4, 0, true); // Disk number
    eocdView.setUint16(6, 0, true); // Disk with CD
    eocdView.setUint16(8, this.files.length, true); // Total entries disk
    eocdView.setUint16(10, this.files.length, true); // Total entries
    eocdView.setUint32(12, centralDirSize, true); // Size of CD
    eocdView.setUint32(16, localOffset, true); // Offset of CD
    eocdView.setUint16(20, 0, true); // Comment len

    // Combine all chunks into one Blob
    const blobParts = [];
    for (const h of localHeaders) {
      blobParts.push(h.bytes);
    }
    for (const c of centralHeaders) {
      blobParts.push(c);
    }
    blobParts.push(eocd);

    return new Blob(blobParts, { type: 'application/zip' });
  }
}

// Generate Minimal Valid PDF Dummy Content for offline reader compatibility
function generateMockPdfContent(docName, version, department, status) {
  return `%PDF-1.4
1 0 obj
<< /Title (${docName})
   /Author (GyanSetu Metro Knowledge Store)
   /Subject (${department} - Version ${version} [Status: ${status}])
   /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)})
>>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> >> >>
endobj
5 0 obj
<< /Length 200 >>
stream
BT
/F1 18 Tf
50 720 Td
(GyanSetu Metro Knowledge Vault Archive) Tj
/F1 12 Tf
0 -30 Td
(Document: ${docName}) Tj
0 -20 Td
(Department: ${department} | Version: ${version}) Tj
0 -20 Td
(Authoritative Release Status: ${status}) Tj
0 -30 Td
(This document has been archived from GyanSetu on-premise knowledge repository.) Tj
ET
endstream
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 7
0000000000 65535 f
0000000009 00000 n
0000000150 00000 n
0000000200 00000 n
0000000260 00000 n
0000000380 00000 n
0000000630 00000 n
trailer
<< /Size 7 /Root 2 0 R /Info 1 0 R >>
startxref
705
%%EOF`;
}

/**
 * Creates and downloads the complete GyanSetu Document Vault (.zip)
 * @param {Array} documents - Current list of documents from documentService / context
 */
export async function exportDocumentVaultZip(documents = []) {
  const zip = new SimpleZipBuilder();
  const dateStr = new Date().toISOString().slice(0, 10);
  const rootFolder = `GyanSetu_Backup_${dateStr}`;

  // 1. Generate catalog_manifest.csv (Excel & Calc readable)
  const csvHeaders = ['Document Name', 'Department', 'Version', 'Status', 'File Size', 'Upload Date', 'Lineage ID', 'Tags'];
  const csvRows = documents.map(d => {
    const tagsStr = (d.tags || []).map(t => t.label || t).join('; ');
    const safeName = `"${(d.name || '').replace(/"/g, '""')}"`;
    const safeDept = `"${(d.department || 'General').replace(/"/g, '""')}"`;
    const safeVer = `"${(d.version || 'v1.0').replace(/"/g, '""')}"`;
    const safeStatus = `"${(d.docStatus || 'Current').replace(/"/g, '""')}"`;
    const safeSize = `"${(d.size || 'Standard').replace(/"/g, '""')}"`;
    const safeDate = `"${(d.uploadedAt || new Date().toISOString()).replace(/"/g, '""')}"`;
    const safeLineage = `"${(d.lineageId || d.id || '').replace(/"/g, '""')}"`;
    const safeTags = `"${tagsStr.replace(/"/g, '""')}"`;
    return [safeName, safeDept, safeVer, safeStatus, safeSize, safeDate, safeLineage, safeTags].join(',');
  });

  const manifestCsv = [csvHeaders.join(','), ...csvRows].join('\r\n');
  zip.addFile(`${rootFolder}/catalog_manifest.csv`, manifestCsv);

  // 2. Generate replacement_lineage.json (Machine-readable parent-child lineage tree)
  const lineageGroups = {};
  for (const doc of documents) {
    const key = doc.lineageId || doc.id || 'ungrouped';
    if (!lineageGroups[key]) {
      lineageGroups[key] = {
        lineageId: key,
        department: doc.department || 'General',
        totalRevisions: 0,
        activeCurrentFile: null,
        revisions: []
      };
    }
    lineageGroups[key].totalRevisions += 1;
    if (doc.docStatus === 'Current' || doc.docStatus === 'Active') {
      lineageGroups[key].activeCurrentFile = doc.name;
    }
    lineageGroups[key].revisions.push({
      id: doc.id,
      name: doc.name,
      version: doc.version || 'v1.0',
      status: doc.docStatus || 'Current',
      uploadedAt: doc.uploadedAt,
      size: doc.size,
      tags: doc.tags || [],
    });
  }

  const lineageReport = {
    exportedAt: new Date().toISOString(),
    system: "GyanSetu Metro Knowledge Management System",
    totalDocuments: documents.length,
    totalLineageGroups: Object.keys(lineageGroups).length,
    lineageRegistry: Object.values(lineageGroups),
  };
  zip.addFile(`${rootFolder}/replacement_lineage.json`, lineageReport);

  // 3. Build Organized Directory Tree: <Root>/Documents/<Department>/<Active | Replaced_History>/<Filename>
  for (const doc of documents) {
    const deptFolder = (doc.department || 'General_Engineering').replace(/[^a-zA-Z0-9_-]/g, '_');
    const isCurrent = doc.docStatus === 'Current' || doc.docStatus === 'Active';
    const statusFolder = isCurrent ? 'Active' : 'Replaced_History';
    const safeFileName = doc.name || `Document_${doc.id}.pdf`;

    const filePath = `${rootFolder}/Documents/${deptFolder}/${statusFolder}/${safeFileName}`;
    const pdfContent = generateMockPdfContent(doc.name, doc.version || 'v1.0', doc.department || 'General', doc.docStatus || 'Current');
    zip.addFile(filePath, pdfContent);
  }

  // 4. Download generated .zip file
  const zipBlob = zip.buildBlob();
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GyanSetu_Backup_${dateStr}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
