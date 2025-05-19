#!/bin/bash

# Function to get the count of records without embeddings
get_remaining_count() {
  count=$(curl -s -X GET 'https://vfdbyvnjhimmnbyhxyun.supabase.co/rest/v1/emission_factors?select=count&embedding=is.null' \
    -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzOTYxNCwiZXhwIjoyMDYwMjE1NjE0fQ.2dmWAge0FVBFOJKSC6vIc5PJRGKTB0WVJO-hznkTWSg' \
    -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzOTYxNCwiZXhwIjoyMDYwMjE1NjE0fQ.2dmWAge0FVBFOJKSC6vIc5PJRGKTB0WVJO-hznkTWSg' | jq '.[0].count')
  echo $count
}

# Function to process a batch
process_batch() {
  echo "Processing batch of 50 records..."
  curl -s -X POST 'https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/generateEmbeddings' \
    -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzOTYxNCwiZXhwIjoyMDYwMjE1NjE0fQ.2dmWAge0FVBFOJKSC6vIc5PJRGKTB0WVJO-hznkTWSg' \
    -H 'Content-Type: application/json' \
    -d '{"batchSize": 50}'
  
  # Sleep for 2 seconds to avoid rate limits
  sleep 2
}

# Main loop
initial_count=$(get_remaining_count)
echo "Initial count of records without embeddings: $initial_count"

while true; do
  current_count=$(get_remaining_count)
  
  if [ "$current_count" -eq 0 ]; then
    echo "All records have been processed!"
    break
  fi
  
  echo "Records remaining: $current_count"
  process_batch
done

echo "Processing complete!" 