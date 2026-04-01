const fs = require("fs/promises");

const detectDelimiter = (headerLine) => {
  if (!headerLine) {
    return ",";
  }

  const delimiters = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = -1;

  for (const delimiter of delimiters) {
    const count = headerLine.split(delimiter).length;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  return best;
};

const parseCsvPreview = async (filePath) => {
  const content = await fs.readFile(filePath, "utf8");
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return {
      headers: [],
      rows: 0,
      columns: 0,
      delimiter: ","
    };
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      headers: [],
      rows: 0,
      columns: 0,
      delimiter: ","
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map((header) => header.trim());

  return {
    headers,
    rows: Math.max(lines.length - 1, 0),
    columns: headers.length,
    delimiter
  };
};

const readCsvAnalysis = async (filePath, sampleRowLimit = 5) => {
  const content = await fs.readFile(filePath, "utf8");
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return {
      headers: [],
      rows: 0,
      columns: 0,
      delimiter: ",",
      sampleRows: []
    };
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      headers: [],
      rows: 0,
      columns: 0,
      delimiter: ",",
      sampleRows: []
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map((header) => header.trim());
  const sampleRows = lines
    .slice(1, sampleRowLimit + 1)
    .map((line) => line.split(delimiter).map((value) => value.trim()));

  return {
    headers,
    rows: Math.max(lines.length - 1, 0),
    columns: headers.length,
    delimiter,
    sampleRows
  };
};

module.exports = {
  parseCsvPreview,
  readCsvAnalysis
};
