'use strict';
const fs = require('fs');
const path = require('path');

const dataDirectory = path.join(__dirname, '..', 'data');
const filePattern = /^[a-z0-9][a-z0-9._-]*\.json$/i;

function isCompatibleLearningPathData(data) {
  return Boolean(data && data.schema_version === 1 && typeof data.semester === 'string' &&
    typeof data.title === 'string' && data.venue_groups && typeof data.venue_groups === 'object' &&
    Array.isArray(data.classes) && Array.isArray(data.general_information?.blocks) &&
    Array.isArray(data.additional_pages) && Array.isArray(data.date_conflicts));
}

function readLearningPath(filename) {
  if (typeof filename !== 'string' || !filePattern.test(filename) || path.basename(filename) !== filename) return null;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dataDirectory, filename), 'utf8'));
    return isCompatibleLearningPathData(data) ? data : null;
  } catch {
    return null;
  }
}

function listLearningPaths() {
  return fs.readdirSync(dataDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && filePattern.test(entry.name))
    .map((entry) => {
      const data = readLearningPath(entry.name);
      return data ? {
        filename: entry.name,
        semester: data.semester,
        title: data.title,
        date_conflicts: data.date_conflicts,
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.semester.localeCompare(a.semester));
}

function isCompatibleLearningPath(filename) {
  return Boolean(readLearningPath(filename));
}

module.exports = { isCompatibleLearningPathData, readLearningPath, listLearningPaths, isCompatibleLearningPath };
