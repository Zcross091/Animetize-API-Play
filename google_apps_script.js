// google_apps_script.js - Google Apps Script Backend (Reverse Proxy)
// Deploy as Web App -> Execute as "Me" -> Access "Anyone"

const SHEET_NAME = "API_KEYS";
const BOUNTIES_SHEET_NAME = "Bounties";
const CLAIMS_SHEET_NAME = "Bounty_Claims";
const ANIME_SHEET_NAME = "Anime_Links";

// Initialize API Keys Sheet
function getSheet() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = doc.insertSheet(SHEET_NAME);
    sheet.appendRow(["API_KEY", "DATE_ADDED"]);
  }
  return sheet;
}

// Initialize Bounties Sheet
function getBountiesSheet() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(BOUNTIES_SHEET_NAME);
  if (!sheet) {
    sheet = doc.insertSheet(BOUNTIES_SHEET_NAME);
    sheet.appendRow(["ID", "Name_ID", "NumBounties", "Reward", "Reason", "Status", "Token", "Date"]);
  }
  return sheet;
}

// Initialize Claims Sheet
function getClaimsSheet() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(CLAIMS_SHEET_NAME);
  if (!sheet) {
    sheet = doc.insertSheet(CLAIMS_SHEET_NAME);
    sheet.appendRow(["BountyID", "HitmanID", "Logs", "Date", "Status"]);
  }
  return sheet;
}

// Initialize Anime Links Sheet
function getAnimeSheet() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(ANIME_SHEET_NAME);
  if (!sheet) {
    sheet = doc.insertSheet(ANIME_SHEET_NAME);
    sheet.appendRow(["Title", "Episode", "VideoURL", "LastChecked", "Status"]);
  }
  return sheet;
}

// RUN THIS FUNCTION ONCE TO AUTHORIZE THE SCRIPT
function authorize() {
  UrlFetchApp.fetch("https://api.torn.com/v2/torn/");
}

// Handle GET requests (API Proxy)
function doGet(e) {
  var endpoint = e.parameter.endpoint;
  
  if (!endpoint) {
    return ContentService.createTextOutput(JSON.stringify({error: "No endpoint specified"}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Handle Fetching Cached Anime Links
  if (endpoint === 'anime_links') {
    var title = e.parameter.title;
    var ep = e.parameter.ep;
    var sheet = getAnimeSheet();
    var data = sheet.getDataRange().getValues();
    
    // If title and ep are provided, return specific episode link
    if (title && ep) {
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === title && data[i][1].toString() === ep && data[i][4] === "ACTIVE") {
          return ContentService.createTextOutput(JSON.stringify({url: data[i][2]}))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({error: "Not found in cache"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Handle Fetching Active Bounties
  if (endpoint === 'bounties') {
    var sheet = getBountiesSheet();
    var data = sheet.getDataRange().getValues();
    var activeBounties = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][5] === "ACTIVE") {
        activeBounties.push({
          id: data[i][0],
          targetNameId: data[i][1],
          numBounties: data[i][2],
          reward: data[i][3],
          reason: data[i][4]
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({bounties: activeBounties}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // --- CACHE LAYER ---
  var cache = CacheService.getScriptCache();
  var cachedResult = cache.get(endpoint);
  
  if (cachedResult) {
    return ContentService.createTextOutput(cachedResult)
      .setMimeType(ContentService.MimeType.JSON);
  }
  // -------------------

  // Get keys from sheet
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var keys = [];
  
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0].toString().trim();
    if (key.length === 16) {
      keys.push(key);
    }
  }

  // Fallback to master key if sheet is empty
  if (keys.length === 0) {
    keys.push("lMzaRITl5w3eQY9d");
  }

  // Pick a random key from the pool to distribute load
  var randomKey = keys[Math.floor(Math.random() * keys.length)];

  // Fetch from Torn API on behalf of the user (Dynamic v1/v2 format)
  try {
    var v2Endpoints = ['torn/bounties', 'faction/members', 'user/attacks', 'faction/crimes', 'torn/calendar'];
    var isV2 = v2Endpoints.indexOf(endpoint) !== -1 || endpoint.indexOf('forum/') === 0 || endpoint.indexOf('market/') === 0;
    
    var url;
    var options = {
      method: "GET",
      muteHttpExceptions: true,
      headers: {}
    };

    if (endpoint.indexOf('v1market/') === 0) {
      var parts = endpoint.split('/');
      var id = parts[1] || '';
      var sel = parts[2] || '';
      url = "https://api.torn.com/market/" + id + "?selections=" + sel + "&key=" + randomKey;
    } else if (isV2) {
      url = "https://api.torn.com/v2/" + endpoint;
      options.headers["Authorization"] = "ApiKey " + randomKey;
    } else {
      var parts = endpoint.split('/');
      var cat = parts[0] || '';
      var sel = parts[1] || '';
      url = "https://api.torn.com/" + cat + "/?selections=" + sel + "&key=" + randomKey;
    }
    
    var response = UrlFetchApp.fetch(url, options);
    var result = response.getContentText();
    
    // Save to cache for 15 seconds to allow fast refresh while preventing API exhaustion
    if (result.length < 100000) { // Google Script Cache limits item size to 100KB
       cache.put(endpoint, result, 15);
    }

    // Return the Torn data directly to the frontend. The API key is NEVER sent!
    return ContentService.createTextOutput(result)
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: "Torn API proxy fetch failed: " + err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle POST requests (Saving new crowdsourced keys to the pool or submitting bounties)
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    
    // Handle Save Anime Link
    if (body && body.action === 'saveAnimeLink') {
      var sheet = getAnimeSheet();
      var data = sheet.getDataRange().getValues();
      var found = false;
      
      // Update existing if exists
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === body.title && data[i][1].toString() === body.episode.toString()) {
          sheet.getRange(i + 1, 3).setValue(body.url);
          sheet.getRange(i + 1, 4).setValue(new Date().toISOString());
          sheet.getRange(i + 1, 5).setValue("ACTIVE");
          found = true;
          break;
        }
      }
      
      if (!found) {
        sheet.appendRow([body.title, body.episode, body.url, new Date().toISOString(), "ACTIVE"]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle Bounty Submission
    if (body && body.action === 'submitBounty') {
      var sheet = getBountiesSheet();
      var id = 'BTY-' + Math.floor(100 + Math.random() * 900);
      var token = 'TX-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      
      sheet.appendRow([
        id, 
        body.targetNameId, 
        body.numBounties, 
        body.reward, 
        body.reason, 
        "PENDING_DEPOSIT", 
        token, 
        new Date().toISOString()
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({status: "success", token: token, id: id}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Handle Hitman Bounty Claim
    if (body && body.action === 'submitClaim') {
      var sheet = getClaimsSheet();
      sheet.appendRow([
        body.bountyId,
        body.hitmanId,
        body.logs,
        new Date().toISOString(),
        "PENDING"
      ]);
      
      // Send Email Notification
      var emailSubj = "New Hitman Claim Submitted: " + body.bountyId;
      var emailBody = "A new attack log was submitted on the Syndicate website!\n\n" +
                      "Bounty ID: " + body.bountyId + "\n" +
                      "Hitman ID: " + body.hitmanId + "\n" +
                      "Attack Logs: " + body.logs + "\n\n" +
                      "Check your Google Sheet to verify and APPROVE this claim.";
      try {
        MailApp.sendEmail("endeavour091@gmail.com", emailSubj, emailBody);
      } catch(e) {
        // Silently fail if email limit reached or not authorized
      }
      
      return ContentService.createTextOutput(JSON.stringify({status: "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Handle API Key Submission
    if (body && body.api_key && body.api_key.length === 16) {
      var sheet = getSheet();
      
      // Check for duplicates
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === body.api_key) {
           return ContentService.createTextOutput(JSON.stringify({status: "success", msg: "Key already exists"}))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      sheet.appendRow([body.api_key, new Date().toISOString()]);
      
      return ContentService.createTextOutput(JSON.stringify({status: "success", msg: "Key added to pool"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: "error", msg: "Invalid API Key"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", msg: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// BACKGROUND ESCROW VERIFICATION TRIGGER
// ==========================================
// Set this function to run on a Time-Driven Trigger every 2-3 minutes
function verifyEscrowPayments() {
  var sheet = getBountiesSheet();
  var data = sheet.getDataRange().getValues();
  var pendingRows = [];
  
  // Find all pending bounties
  for (var i = 1; i < data.length; i++) {
    if (data[i][5] === "PENDING_DEPOSIT") {
      // Reward is at index 3. Parse it as a number so we can calculate the expected total cash.
      // E.g., if reward is 5000000, expected total is 5000000 + 2000000 (Service Fee) = 7000000.
      var reward = parseInt(data[i][3]) || 0;
      pendingRows.push({
        rowIdx: i + 1, // +1 because row index is 1-based in google sheets
        token: data[i][6],
        expectedCash: reward + 2000000,
        expectedXanax: 2
      }); 
    }
  }
  
  if (pendingRows.length === 0) return; // Nothing to check
  
  // Use the Escrow Holder's Hardcoded API Key to reliably check their specific events
  var apiKey = "lMzaRITl5w3eQY9d"; 
  
  var url = "https://api.torn.com/user/?selections=events&key=" + apiKey;
  try {
    var response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
    var json = JSON.parse(response.getContentText());
    
    if (json.events) {
      for (var eventId in json.events) {
        var eventText = json.events[eventId].event || "";
        
        // Loop through pending rows
        for (var p = 0; p < pendingRows.length; p++) {
          var pending = pendingRows[p];
          if (eventText.indexOf(pending.token) !== -1) {
            
            // Check if exact cash was sent: "$7,000,000" or "7,000,000"
            // We format the expected cash with commas to strictly match the Torn event log syntax
            var formattedCash = "$" + pending.expectedCash.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            var cashMatch = eventText.indexOf(formattedCash) !== -1;
            
            // Check if Xanax was sent (e.g., "2x Xanax")
            var xanaxMatch = eventText.toLowerCase().indexOf(pending.expectedXanax + "x xanax") !== -1;
            
            if (cashMatch || xanaxMatch) {
              // Valid payment!
              sheet.getRange(pending.rowIdx, 6).setValue("ACTIVE");
              pendingRows.splice(p, 1);
              p--;
            }
          }
        }
      }
    }
  } catch(e) {
    // Silently fail if Torn API is unreachable during trigger
  }
}

// Automatically decrement NumBounties when a Claim is APPROVED
function onEdit(e) {
  if (!e || !e.range) return;
  
  var sheet = e.range.getSheet();
  if (sheet.getName() !== CLAIMS_SHEET_NAME) return;
  
  // Status is column 5 (E)
  if (e.range.getColumn() === 5 && e.value === "APPROVED") {
    var row = e.range.getRow();
    var bountyId = sheet.getRange(row, 1).getValue(); // BountyID is in Column 1 (A)
    
    if (bountyId) {
      var bountiesSheet = getBountiesSheet();
      var data = bountiesSheet.getDataRange().getValues();
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === bountyId) { // Match ID in Column 1 (A)
          var currentNum = parseInt(data[i][2]); // NumBounties is Column 3 (C), index 2
          if (!isNaN(currentNum) && currentNum > 0) {
            var newNum = currentNum - 1;
            bountiesSheet.getRange(i + 1, 3).setValue(newNum);
            
            if (newNum === 0) {
               // Change Status in Column 6 (F) to COMPLETED
               bountiesSheet.getRange(i + 1, 6).setValue("COMPLETED");
            }
          }
          break;
        }
      }
    }
  }
}

// ==========================================
// BACKGROUND ANIME LINK CHECKER
// ==========================================
// Set this function to run on a Time-Driven Trigger (e.g., every 6 hours)
function checkAnimeLinks() {
  var sheet = getAnimeSheet();
  var data = sheet.getDataRange().getValues();
  
  // To avoid hitting 6-minute execution limits, we only check 50 links per run
  // We prioritize links that haven't been checked in the last 24 hours
  var now = new Date();
  var checkedCount = 0;
  
  for (var i = 1; i < data.length; i++) {
    if (checkedCount >= 50) break;
    
    if (data[i][4] === "ACTIVE") {
      var lastChecked = new Date(data[i][3] || 0);
      var diffHours = Math.abs(now - lastChecked) / 36e5;
      
      if (diffHours > 24) {
        var url = data[i][2];
        try {
          // Attempt to ping the player.php link or iframe link
          var options = {
            muteHttpExceptions: true,
            method: "get"
          };
          var response = UrlFetchApp.fetch(url, options);
          var rc = response.getResponseCode();
          
          if (rc === 404 || rc === 403 || rc >= 500) {
            sheet.getRange(i + 1, 5).setValue("BROKEN"); // Mark as broken so Vercel re-scrapes it
          }
        } catch (e) {
          // If fetch fails entirely, mark as broken
          sheet.getRange(i + 1, 5).setValue("BROKEN");
        }
        
        sheet.getRange(i + 1, 4).setValue(now.toISOString()); // Update last checked timestamp
        checkedCount++;
      }
    }
  }
}
