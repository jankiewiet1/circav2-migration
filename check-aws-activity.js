import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail'
import dotenv from 'dotenv'

dotenv.config()

const cloudTrailClient = new CloudTrailClient({
  region: 'eu-central-1',
  credentials: {
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
})

async function checkTextractActivity() {
  console.log('🔍 Checking AWS Textract activity in the last hour...')
  
  try {
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000) // 1 hour ago
    
    const command = new LookupEventsCommand({
      LookupAttributes: [
        {
          AttributeKey: 'EventName',
          AttributeValue: 'AnalyzeDocument'
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
    })

    const response = await cloudTrailClient.send(command)
    
    console.log(`Found ${response.Events?.length || 0} Textract events`)
    
    if (response.Events && response.Events.length > 0) {
      response.Events.forEach((event, index) => {
        console.log(`\n📋 Event ${index + 1}:`)
        console.log(`- Time: ${event.EventTime}`)
        console.log(`- Event: ${event.EventName}`)
        console.log(`- User: ${event.Username || 'N/A'}`)
        console.log(`- Source IP: ${event.SourceIPAddress || 'N/A'}`)
        console.log(`- Error Code: ${event.ErrorCode || 'None'}`)
        console.log(`- Error Message: ${event.ErrorMessage || 'None'}`)
        
        if (event.CloudTrailEvent) {
          try {
            const eventData = JSON.parse(event.CloudTrailEvent)
            console.log(`- Request ID: ${eventData.requestID || 'N/A'}`)
            console.log(`- AWS Region: ${eventData.awsRegion || 'N/A'}`)
          } catch (e) {
            console.log('- Could not parse event data')
          }
        }
      })
    } else {
      console.log('\n❌ No Textract API calls found in the last hour')
      console.log('This could mean:')
      console.log('1. The edge function is not calling Textract')
      console.log('2. CloudTrail logging is not enabled')
      console.log('3. There\'s a different issue preventing the calls')
    }
    
  } catch (error) {
    console.error('❌ Error checking CloudTrail:', error.message)
    
    if (error.name === 'AccessDenied') {
      console.log('\n💡 CloudTrail access denied. You can still check:')
      console.log('1. AWS Console → CloudWatch → Metrics → AWS/Textract')
      console.log('2. AWS Console → CloudTrail → Event history')
    }
  }
}

async function checkCloudWatchMetrics() {
  console.log('\n📊 To check CloudWatch metrics manually:')
  console.log('1. Go to: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#metricsV2:graph=~();namespace=AWS/Textract')
  console.log('2. Look for these metrics:')
  console.log('   - SuccessfulRequestCount')
  console.log('   - UserErrorCount') 
  console.log('   - ServerErrorCount')
  console.log('   - ThrottledCount')
}

async function main() {
  console.log('🚀 AWS Textract Activity Checker')
  console.log('================================')
  
  await checkTextractActivity()
  await checkCloudWatchMetrics()
  
  console.log('\n🔗 Direct Links:')
  console.log('CloudWatch Metrics: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#metricsV2:namespace=AWS/Textract')
  console.log('CloudTrail Events: https://eu-central-1.console.aws.amazon.com/cloudtrail/home?region=eu-central-1#/events')
}

main().catch(console.error) 