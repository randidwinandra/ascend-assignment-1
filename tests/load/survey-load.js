import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 20 },    // Stay at 20 users
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must be below 2s
    http_req_failed: ['rate<0.01'],    // Less than 1% error rate
    errors: ['rate<0.01'],             // Less than 1% custom errors
  },
};

// Test configuration from environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'your-anon-key';

// Sample survey data
const SURVEY_DATA = {
  title: `Load Test Survey ${Date.now()}`,
  description: 'This is a load test survey created by K6',
  questions: [
    {
      question_text: 'How satisfied are you with our service?',
      options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
      required: true,
      order_index: 0
    },
    {
      question_text: 'Would you recommend us to others?',
      options: ['Yes', 'No', 'Maybe'],
      required: true,
      order_index: 1
    },
    {
      question_text: 'How did you hear about us?',
      options: ['Social Media', 'Search Engine', 'Word of Mouth', 'Advertisement', 'Other'],
      required: false,
      order_index: 2
    }
  ]
};

// Test scenarios
export default function() {
  const scenario = Math.random();
  
  if (scenario < 0.6) {
    // 60% - Survey response submission (most common)
    testSurveyResponse();
  } else if (scenario < 0.8) {
    // 20% - Survey retrieval
    testSurveyRetrieval();
  } else {
    // 20% - Admin operations (less common)
    testAdminOperations();
  }
  
  sleep(1 + Math.random() * 2); // Random sleep between 1-3 seconds
}

// Test survey response submission
function testSurveyResponse() {
  // Use a known survey token or create one
  const surveyToken = getSurveyToken();
  
  if (!surveyToken) {
    console.log('No survey token available, skipping response test');
    return;
  }
  
  // Get survey by token
  const getSurveyResponse = http.get(`${SUPABASE_URL}/functions/v1/get-survey-by-token/${surveyToken}`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  
  const surveyCheckPassed = check(getSurveyResponse, {
    'survey retrieval status is 200': (r) => r.status === 200,
    'survey retrieval response time < 500ms': (r) => r.timings.duration < 500,
    'survey has valid structure': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success && data.data && data.data.questions;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!surveyCheckPassed) {
    errorRate.add(1);
    return;
  }
  
  // Submit response
  const responseData = {
    survey_token: surveyToken,
    responses: [
      { question_id: 'q1', option_id: 'opt1' },
      { question_id: 'q2', option_id: 'opt2' }
    ]
  };
  
  const submitResponse = http.post(`${SUPABASE_URL}/functions/v1/submit-response`, 
    JSON.stringify(responseData), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'X-Forwarded-For': generateRandomIP(),
      },
    }
  );
  
  const submitCheckPassed = check(submitResponse, {
    'response submission status is 201 or 429': (r) => r.status === 201 || r.status === 429,
    'response submission time < 1000ms': (r) => r.timings.duration < 1000,
    'response has valid structure': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success !== undefined || data.error !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!submitCheckPassed) {
    errorRate.add(1);
  }
}

// Test survey retrieval
function testSurveyRetrieval() {
  const surveyToken = getSurveyToken();
  
  if (!surveyToken) {
    console.log('No survey token available, skipping retrieval test');
    return;
  }
  
  const response = http.get(`${SUPABASE_URL}/functions/v1/get-survey-by-token/${surveyToken}`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  
  const checkPassed = check(response, {
    'survey retrieval status is 200': (r) => r.status === 200,
    'survey retrieval response time < 500ms': (r) => r.timings.duration < 500,
    'survey has questions': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success && data.data && data.data.questions && data.data.questions.length > 0;
      } catch (e) {
        return false;
      }
    },
    'survey has vote counts': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && typeof data.data.total_votes === 'number';
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!checkPassed) {
    errorRate.add(1);
  }
}

// Test admin operations (requires authentication)
function testAdminOperations() {
  // Test getting surveys list (this would need proper JWT token in real scenario)
  const response = http.get(`${SUPABASE_URL}/functions/v1/get-surveys`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  
  // This will likely return 401 without proper JWT, but we test the endpoint responsiveness
  const checkPassed = check(response, {
    'admin endpoint responds': (r) => r.status === 401 || r.status === 200,
    'admin endpoint response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  if (!checkPassed) {
    errorRate.add(1);
  }
}

// Helper functions
function getSurveyToken() {
  // In a real load test, you would have a pool of known survey tokens
  // For this test, we'll use a placeholder or environment variable
  const tokens = __ENV.SURVEY_TOKENS ? __ENV.SURVEY_TOKENS.split(',') : [];
  
  if (tokens.length > 0) {
    return tokens[Math.floor(Math.random() * tokens.length)];
  }
  
  // Return a placeholder token for testing
  return 'test-survey-token';
}

function generateRandomIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// Setup function - runs once before all VUs
export function setup() {
  console.log('Starting load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('Test configuration:');
  console.log('- Max VUs: 100');
  console.log('- Duration: ~6 minutes');
  console.log('- Scenarios: 60% responses, 20% retrieval, 20% admin');
  console.log('- Thresholds: P95 < 2s, Error rate < 1%');
  
  return {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    supabaseUrl: SUPABASE_URL
  };
}

// Teardown function - runs once after all VUs
export function teardown(data) {
  console.log('Load test completed!');
  console.log(`Started at: ${data.timestamp}`);
  console.log(`Completed at: ${new Date().toISOString()}`);
  
  // In a real scenario, you might want to clean up test data here
} 