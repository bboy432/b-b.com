// Google Sheets API client configuration
const API_KEY = 'AIzaSyAP50YCu9tHfShHdE_BPfHL2Q0m3_bLcHI'; // You'll need to get this from Google Cloud Console
const CLIENT_ID = '661685921875-ggjhqkpohipue560nnhhia4711d4aptf.apps.googleusercontent.com'; // You'll need to get this from Google Cloud Console
const SPREADSHEET_ID = '1P5liJkxzNqVBbrsaMdxT1MZ7Lk3j3ICL5J_M_mDdrVU'; // Get this from your Google Sheet URL
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

// Sheet names/IDs for different data tables
const USERS_SHEET = 'Users';
const UNPAID_CHARGES_SHEET = 'UnpaidCharges';
const PAID_CHARGES_SHEET = 'PaidCharges';

// Initialize the API client
function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    scope: SCOPES,
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
  }).then(() => {
    // Listen for sign-in state changes
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
    // Handle the initial sign-in state
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    
    // Bind buttons for authentication
    document.getElementById('authorize_button').onclick = handleAuthClick;
    document.getElementById('signout_button').onclick = handleSignoutClick;
  }).catch(error => {
    console.error('Error initializing Google API client:', error);
    document.getElementById('content').innerText = 'Error initializing Google API client: ' + error.message;
  });
}

// Update UI based on signin status
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    document.getElementById('authorize_button').style.display = 'none';
    document.getElementById('signout_button').style.display = 'block';
    loadUserData();
  } else {
    document.getElementById('authorize_button').style.display = 'block';
    document.getElementById('signout_button').style.display = 'none';
    document.getElementById('content').innerText = 'Please authorize to access your data.';
  }
}

// Sign in the user upon button click
function handleAuthClick() {
  gapi.auth2.getAuthInstance().signIn();
}

// Sign out the user upon button click
function handleSignoutClick() {
  gapi.auth2.getAuthInstance().signOut();
}

// Load the API and initialize
function gapiLoaded() {
  gapi.load('client:auth2', initClient);
}

// Create a new user account
function createAccount(username, email, password) {
  // Hash the password (in a real application, use a stronger method)
  const hashedPassword = hashPassword(password);
  
  // Prepare the user data
  const userData = [
    [username, email, hashedPassword, new Date().toISOString()]
  ];
  
  // Append to the Users sheet
  gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: USERS_SHEET,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: userData
    }
  }).then(response => {
    console.log('User created:', response);
    document.getElementById('content').innerText = 'Account created successfully!';
  }).catch(error => {
    console.error('Error creating user:', error);
    document.getElementById('content').innerText = 'Error creating account: ' + error.message;
  });
}

// Simple password hashing (use a better method in production)
function hashPassword(password) {
  // This is not secure - use a proper hashing library in production
  return btoa(password); // Just base64 encoding for example
}

// Authenticate user
function loginUser(email, password) {
  // Hash the provided password
  const hashedPassword = hashPassword(password);
  
  // Fetch users from the sheet
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: USERS_SHEET
  }).then(response => {
    const users = response.result.values || [];
    
    // Find user with matching email and password
    const user = users.find(user => user[1] === email && user[2] === hashedPassword);
    
    if (user) {
      // Set user session
      sessionStorage.setItem('currentUser', JSON.stringify({
        username: user[0],
        email: user[1],
        createdAt: user[3]
      }));
      
      document.getElementById('content').innerText = 'Logged in successfully!';
      loadUserCharges();
    } else {
      document.getElementById('content').innerText = 'Invalid email or password.';
    }
  }).catch(error => {
    console.error('Error during login:', error);
    document.getElementById('content').innerText = 'Error during login: ' + error.message;
  });
}

// Load unpaid charges for the current user
function loadUserCharges() {
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!currentUser) {
    document.getElementById('content').innerText = 'Please log in.';
    return;
  }
  
  // Fetch unpaid charges
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: UNPAID_CHARGES_SHEET
  }).then(response => {
    const charges = response.result.values || [];
    const userCharges = charges.filter(charge => charge[0] === currentUser.email);
    
    // Display charges
    let chargesHTML = '<h2>Your Unpaid Charges</h2>';
    if (userCharges.length === 0) {
      chargesHTML += '<p>No unpaid charges found.</p>';
    } else {
      chargesHTML += '<table><tr><th>Description</th><th>Amount</th><th>Date</th><th>Action</th></tr>';
      userCharges.forEach((charge, index) => {
        chargesHTML += `<tr>
          <td>${charge[1]}</td>
          <td>$${charge[2]}</td>
          <td>${charge[3]}</td>
          <td><button onclick="processPayment(${index})">Pay Now</button></td>
        </tr>`;
      });
      chargesHTML += '</table>';
    }
    
    document.getElementById('content').innerHTML = chargesHTML;
  }).catch(error => {
    console.error('Error loading charges:', error);
    document.getElementById('content').innerText = 'Error loading charges: ' + error.message;
  });
}

// Process payment for a charge
function processPayment(chargeIndex) {
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!currentUser) {
    document.getElementById('content').innerText = 'Please log in.';
    return;
  }
  
  // 1. Get all unpaid charges
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: UNPAID_CHARGES_SHEET
  }).then(response => {
    const charges = response.result.values || [];
    const userCharges = charges.filter(charge => charge[0] === currentUser.email);
    
    if (chargeIndex >= userCharges.length) {
      document.getElementById('content').innerText = 'Invalid charge selected.';
      return;
    }
    
    const chargeToProcess = userCharges[chargeIndex];
    const rowIndex = charges.findIndex(charge => 
      charge[0] === chargeToProcess[0] && 
      charge[1] === chargeToProcess[1] && 
      charge[2] === chargeToProcess[2] && 
      charge[3] === chargeToProcess[3]
    );
    
    if (rowIndex === -1) {
      document.getElementById('content').innerText = 'Charge not found.';
      return;
    }
    
    // 2. Add to paid charges
    const paidCharge = [...chargeToProcess, new Date().toISOString()]; // Add payment date
    
    gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: PAID_CHARGES_SHEET,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [paidCharge]
      }
    }).then(() => {
      // 3. Remove from unpaid charges (actual row number is index + 1, and +1 for header row)
      return gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: getSheetId(UNPAID_CHARGES_SHEET),
                dimension: 'ROWS',
                startIndex: rowIndex + 1, // +1 for header row
                endIndex: rowIndex + 2
              }
            }
          }]
        }
      });
    }).then(() => {
      document.getElementById('content').innerText = 'Payment processed successfully!';
      // Reload charges after short delay
      setTimeout(loadUserCharges, 1000);
    }).catch(error => {
      console.error('Error processing payment:', error);
      document.getElementById('content').innerText = 'Error processing payment: ' + error.message;
    });
  }).catch(error => {
    console.error('Error loading charges for payment:', error);
    document.getElementById('content').innerText = 'Error loading charges: ' + error.message;
  });
}

// Helper function to get sheet ID by name (you'll need to implement this)
function getSheetId(sheetName) {
  // In a real implementation, you would fetch the spreadsheet metadata
  // and find the sheet ID by name
  // For simplicity, you might hardcode these values
  switch(sheetName) {
    case USERS_SHEET: return 0; // Replace with actual sheet ID
    case UNPAID_CHARGES_SHEET: return 1; // Replace with actual sheet ID
    case PAID_CHARGES_SHEET: return 2; // Replace with actual sheet ID
    default: return 0;
  }
}

// Admin function to add a charge (should only be callable by you)
function adminAddCharge(userEmail, description, amount) {
  // This function should be protected and only accessible to you
  // In a GitHub Pages context, you'd need to implement proper authentication
  // For now, we'll assume you have a separate admin page
  
  const chargeData = [
    [userEmail, description, amount, new Date().toISOString()]
  ];
  
  gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: UNPAID_CHARGES_SHEET,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: chargeData
    }
  }).then(response => {
    console.log('Charge added:', response);
    document.getElementById('content').innerText = 'Charge added successfully!';
  }).catch(error => {
    console.error('Error adding charge:', error);
    document.getElementById('content').innerText = 'Error adding charge: ' + error.message;
  });
}
