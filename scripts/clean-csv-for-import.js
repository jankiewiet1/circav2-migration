import fs from 'fs';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

const inputFile = '/Users/band.nl/Desktop/EFs/output/all_emission_factors_cleaned.csv';
const outputFile = '/Users/band.nl/Desktop/EFs/output/all_emission_factors_cleaned.csv'; // Same file

function cleanEFValue(value) {
  if (!value || value.trim() === '') {
    return null; // Will be handled as NULL in database
  }
  
  const trimmed = value.trim();
  
  // Handle ranges like "0.02-0.031" - take the average
  if (trimmed.includes('-') && !trimmed.startsWith('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 2) {
      const num1 = parseFloat(parts[0]);
      const num2 = parseFloat(parts[1]);
      if (!isNaN(num1) && !isNaN(num2)) {
        const average = (num1 + num2) / 2;
        return average.toString();
      }
    }
  }
  
  // Handle scientific notation like "1.5e-3"
  if (trimmed.includes('e') || trimmed.includes('E')) {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return num.toString();
    }
  }
  
  // Check if it's already a valid number
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return num.toString();
  }
  
  // If we can't parse it, return null
  console.log(`Warning: Could not parse EF_Value: "${trimmed}"`);
  return null;
}

function isValidRow(row) {
  // Skip rows where essential data is missing or corrupted
  if (!row.Activity || !row.Unit || !row.Source) {
    return false;
  }
  
  // Skip rows where data appears to be shifted (Unit in EF_Value column, etc.)
  if (row.EF_Value && (
    row.EF_Value.includes('kg') || 
    row.EF_Value.includes('TJ') || 
    row.EF_Value.includes('CO2') ||
    row.EF_Value.includes('CH4') ||
    row.EF_Value.includes('N2O')
  )) {
    return false;
  }
  
  return true;
}

async function cleanCSV() {
  console.log('🧹 Starting CSV cleaning process...\n');
  console.log(`📂 Input file: ${inputFile}`);
  
  const cleanedRows = [];
  let totalRows = 0;
  let validRows = 0;
  let skippedRows = 0;
  let fixedValues = 0;
  
  // Read the CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(inputFile)
      .pipe(csv())
      .on('data', (row) => {
        totalRows++;
        
        if (!isValidRow(row)) {
          skippedRows++;
          if (totalRows % 1000 === 0) {
            console.log(`Processed ${totalRows} rows...`);
          }
          return;
        }
        
        // Clean the EF_Value
        const originalValue = row.EF_Value;
        const cleanedValue = cleanEFValue(originalValue);
        
        if (cleanedValue !== originalValue && cleanedValue !== null) {
          fixedValues++;
          if (fixedValues <= 10) { // Only show first 10 fixes to avoid spam
            console.log(`Fixed: "${originalValue}" → "${cleanedValue}"`);
          }
        }
        
        // Create cleaned row
        const cleanedRow = {
          Activity: row.Activity.trim(),
          Fuel: row.Fuel ? row.Fuel.trim() : '',
          Country: row.Country ? row.Country.trim() : '',
          GHG: row.GHG ? row.GHG.trim() : '',
          EF_Value: cleanedValue,
          Unit: row.Unit.trim(),
          Source: row.Source.trim()
        };
        
        // Only add rows with valid EF_Value
        if (cleanedValue !== null) {
          cleanedRows.push(cleanedRow);
          validRows++;
        } else {
          skippedRows++;
        }
        
        if (totalRows % 1000 === 0) {
          console.log(`Processed ${totalRows} rows...`);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`\n📊 Processing complete:`);
  console.log(`   Total rows processed: ${totalRows}`);
  console.log(`   Valid rows: ${validRows}`);
  console.log(`   Skipped rows: ${skippedRows}`);
  console.log(`   Fixed EF_Values: ${fixedValues}`);
  
  // Write cleaned CSV back to the same file
  console.log(`\n💾 Writing cleaned CSV back to: ${outputFile}`);
  
  const csvWriter = createObjectCsvWriter({
    path: outputFile,
    header: [
      { id: 'Activity', title: 'Activity' },
      { id: 'Fuel', title: 'Fuel' },
      { id: 'Country', title: 'Country' },
      { id: 'GHG', title: 'GHG' },
      { id: 'EF_Value', title: 'EF_Value' },
      { id: 'Unit', title: 'Unit' },
      { id: 'Source', title: 'Source' }
    ]
  });
  
  await csvWriter.writeRecords(cleanedRows);
  
  console.log(`\n✅ CSV file cleaned and updated successfully!`);
  console.log(`   File: ${outputFile}`);
  console.log(`   Records: ${cleanedRows.length}`);
  console.log(`\nThe original file has been cleaned and is ready for import.`);
}

cleanCSV().catch(console.error); 