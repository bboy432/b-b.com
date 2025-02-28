// Google Sheets API client configuration
const API_KEY = 'AIzaSyAP50YCu9tHfShHdE_BPfHL2Q0m3_bLcHI'; 
const CLIENT_ID = '661685921875-ggjhqkpohipue560nnhhia4711d4aptf.apps.googleusercontent.com';
const SPREADSHEET_ID = '1P5liJkxzNqVBbrsaMdxT1MZ7Lk3j3ICL5J_M_mDdrVU';
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
    document.getElementById('authorize_button').style.display = 'block';
    document.getElementById('signout_button').style.display = 'none';
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
    document.getElementById('app').style.display = 'block';
    
    // Check if user is logged in
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (currentUser) {
      document.getElementById('userInfo').innerHTML = `<p>Welcome, ${currentUser.username}!</p>`;
      showTab('dashboard');
      loadUserCharges();
    } else {
      showTab('login');
    }
  } else {
    document.getElementById('authorize_button').style.display = 'block';
    document.getElementById('signout_button').style.display = 'none';
    document.getElementById('app').style.display = 'none';
    document.getElementById('content').innerText = 'Please authorize to access the application.';
    // Clear user session on sign out
    sessionStorage.removeItem('currentUser');
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
  
  // Check if user already exists
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: USERS_SHEET
  }).then(response => {
    const users = response.result.values || [];
    const existingUser = users.find(user => user[1] === email);
    
    if (existingUser) {
      document.getElementById('content').innerText = 'An account with this email already exists.';
      return;
    }
    
    // Prepare the user data
    const userData = [
      [username, email, hashedPassword, new Date().toISOString()]
    ];
    
    // Append to the Users sheet
    return gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: USERS_SHEET,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: userData
      }
    });
  }).then(response => {
    console.log('User created:', response);
    document.getElementById('content').innerText = 'Account created successfully! You can now log in.';
    showTab('login');
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
    
    // Skip header row if it exists
    const startIndex = users[0][0] === 'Username' ? 1 : 0;
    
    // Find user with matching email and password
    const user = users.slice(startIndex).find(user => user[1] === email && user[2] === hashedPassword);
    
    if (user) {
      // Set user session
      sessionStorage.setItem('currentUser', JSON.stringify({
        username: user[0],
        email: user[1],
        createdAt: user[3]
      }));
      
      document.getElementById('userInfo').innerHTML = `<p>Welcome, ${user[0]}!</p>`;
      document.getElementById('content').innerText = 'Logged in successfully!';
      showTab('dashboard');
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
    const allCharges = response.result.values || [];
    
    // Skip header row if present
    const startIndex = allCharges[0] && allCharges[0][0] === 'UserEmail' ? 1 : 0;
    const charges = allCharges.slice(startIndex);
    
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
          <td>${new Date(charge[3]).toLocaleDateString()}</td>
          <td><button onclick="processPayment(${index})">Pay Now</button></td>
        </tr>`;
      });
      chargesHTML += '</table>';
    }
    
    // Also show paid charges
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: PAID_CHARGES_SHEET
    }).then(paidResponse => {
      const allPaidCharges = paidResponse.result.values || [];
      
      // Skip header row if present
      const paidStartIndex = allPaidCharges[0] && allPaidCharges[0][0] === 'UserEmail' ? 1 : 0;
      const paidCharges = allPaidCharges.slice(paidStartIndex);
      
      const userPaidCharges = paidCharges.filter(charge => charge[0] === currentUser.email);
      
      chargesHTML += '<h2>Your Payment History</h2>';
      if (userPaidCharges.length === 0) {
        chargesHTML += '<p>No payment history found.</p>';
      } else {
        chargesHTML += '<table><tr><th>Description</th><th>Amount</th><th>Date</th><th>Paid On</th></tr>';
        userPaidCharges.forEach(charge => {
          chargesHTML += `<tr>
            <td>${charge[1]}</td>
            <td>$${charge[2]}</td>
            <td>${new Date(charge[3]).toLocaleDateString()}</td>
            <td>${new Date(charge[4]).toLocaleDateString()}</td>
          </tr>`;
        });
        chargesHTML += '</table>';
      }
      
      document.getElementById('charges').innerHTML = chargesHTML;
    }).catch(error => {
      console.error('Error loading paid charges:', error);
      document.getElementById('charges').innerHTML = chargesHTML + '<p>Error loading payment history.</p>';
    });
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
  
  // Show processing message
  document.getElementById('content').innerText = 'Processing payment...';
  
  // 1. Get all unpaid charges
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: UNPAID_CHARGES_SHEET
  }).then(response => {
    const allCharges = response.result.values || [];
    
    // Skip header row if present
    const startIndex = allCharges[0] && allCharges[0][0] === 'UserEmail' ? 1 : 0;
    const charges = allCharges.slice(startIndex);
    
    const userCharges = charges.filter(charge => charge[0] === currentUser.email);
    
    if (chargeIndex >= userCharges.length) {
      document.getElementById('content').innerText = 'Invalid charge selected.';
      return;
    }
    
    const chargeToProcess = userCharges[chargeIndex];
    
    // Find index in the original array (including header offset)
    const rowIndex = startIndex + allCharges.slice(startIndex).findIndex(charge => 
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
      // 3. Get Sheet IDs
      return gapi.client.sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID
      });
    }).then(spreadsheetData => {
      // Find the sheet ID for unpaid charges
      const sheets = spreadsheetData.result.sheets;
      const unpaidSheet = sheets.find(sheet => 
        sheet.properties.title === UNPAID_CHARGES_SHEET
      );
      
      if (!unpaidSheet) {
        throw new Error('Could not find the unpaid charges sheet');
      }
      
      const unpaidSheetId = unpaidSheet.properties.sheetId;
      
      // 4. Remove from unpaid charges
      return gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: unpaidSheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
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

// Get sheet ID using API request (replaces the hardcoded function)
// This is called in the processPayment function above

// Admin function to add a charge (should only be callable by you)
function adminAddCharge(userEmail, description, amount) {
  // This should be called from the admin interface
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
    document.getElementById('adminContent').innerText = 'Charge added successfully!';
  }).catch(error => {
    console.error('Error adding charge:', error);
    document.getElementById('adminContent').innerText = 'Error adding charge: ' + error.message;
  });
}

// Load API when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Load the Google API
  gapiLoaded();
});
