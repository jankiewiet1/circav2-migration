#!/bin/bash

# Function to get the count of records without embeddings
get_remaining_count() {
  echo "Checking remaining records..."
  response=$(curl -s --max-time 30 -X GET 'https://vfdbyvnjhimmnbyhxyun.supabase.co/rest/v1/emission_entries?select=count&embedding=is.null' \
    -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzOTYxNCwiZXhwIjoyMDYwMjE1NjE0fQ.2dmWAge0FVBFOJKSC6vIc5PJRGKTB0WVJO-hznkTWSg' \
    -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzOTYxNCwiZXhwIjoyMDYwMjE1NjE0fQ.2dmWAge0FVBFOJKSC6vIc5PJRGKTB0WVJO-hznkTWSg')
  
  if [ $? -ne 0 ]; then
    echo "Error getting count, retrying in 5 seconds..."
    sleep 5
    return 1
  fi
  
  count=$(echo "$response" | jq -r '.[0].count')
  if [ $? -ne 0 ] || [ -z "$count" ]; then
    echo "Error parsing count from response: $response"
    sleep 5
    return 1
  fi
  
  echo "Found $count records remaining"
  echo "$count"
  return 0
}

# Function to process a batch
process_batch() {
  echo "Processing batch of 10 records..."
  response=$(curl -s --max-time 30 -X POST 'https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/generateEmissionEntryEmbeddings' \
    -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzOTYxNCwiZXhwIjoyMDYwMjE1NjE0fQ.2dmWAge0FVBFOJKSC6vIc5PJRGKTB0WVJO-hznkTWSg' \
    -H 'Content-Type: application/json' \
    -d '{"batchSize": 10}')
  
  if [ $? -ne 0 ]; then
    echo "Error processing batch, retrying in 5 seconds..."
    sleep 5
    return 1
  fi
  
  echo "Response from function: $response"
  
  # Sleep for 5 seconds to avoid rate limits
  echo "Sleeping for 5 seconds..."
  sleep 5
  return 0
}

# Main loop
echo "Starting emission entry embedding generation..."
while true; do
  initial_count=$(get_remaining_count)
  if [ $? -eq 0 ]; then
    break
  fi
done

echo "Initial count of records without embeddings: $initial_count"

while true; do
  current_count=$(get_remaining_count)
  if [ $? -ne 0 ]; then
    continue
  fi
  
  if [ "$current_count" -eq 0 ]; then
    echo "All records have been processed!"
    break
  fi
  
  echo "Records remaining: $current_count"
  if ! process_batch; then
    continue
  fi
done

echo "Processing complete!" 