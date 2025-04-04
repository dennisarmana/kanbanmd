exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Log the request for debugging
    console.log('Received token exchange request');
    
    // Parse the request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (e) {
      console.error('Error parsing request body:', e);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }
    
    const { code } = requestBody;
    
    if (!code) {
      console.error('Missing code parameter');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing authorization code' })
      };
    }
    
    // Check environment variables (without revealing values)
    const hasClientId = !!process.env.GITHUB_CLIENT_ID;
    const hasClientSecret = !!process.env.GITHUB_CLIENT_SECRET;
    
    console.log('Environment check:', { 
      'GITHUB_CLIENT_ID': hasClientId,
      'GITHUB_CLIENT_SECRET': hasClientSecret
    });
    
    if (!hasClientId || !hasClientSecret) {
      console.error('Missing GitHub credentials in environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          message: 'GitHub credentials not configured'
        })
      };
    }

    // Exchange the code for an access token using fetch instead of axios
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code
      })
    });
    
    // Check if the request was successful
    if (!tokenResponse.ok) {
      console.error('GitHub API error:', tokenResponse.status, tokenResponse.statusText);
      const errorText = await tokenResponse.text();
      console.error('Error response:', errorText);
      
      return {
        statusCode: tokenResponse.status,
        headers,
        body: JSON.stringify({ 
          error: 'GitHub API error', 
          status: tokenResponse.status,
          message: tokenResponse.statusText,
          details: errorText
        })
      };
    }
    
    // Parse the response as JSON
    const tokenData = await tokenResponse.json();
    console.log('GitHub token exchange successful');

    // Return the token response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(tokenData)
    };
  } catch (error) {
    console.error('Unexpected error in token exchange:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to exchange code for token', 
        message: error.message || 'Unknown error'
      })
    };
  }
};
