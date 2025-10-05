# 🔐 Credentials Setup Guide

## Google Cloud Service Account Setup

This project uses Google Cloud APIs for research functionality. Follow these steps to set up your credentials:

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Custom Search API
   - (Any other APIs you need)

### 2. Create Service Account

1. Navigate to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Fill in the details:
   - Name: `supermd-service-account` (or your preferred name)
   - Description: Service account for SuperMD
4. Click **Create and Continue**
5. Grant appropriate roles (e.g., Editor, or specific API roles)
6. Click **Done**

### 3. Generate JSON Key

1. Click on the created service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create New Key**
4. Choose **JSON** format
5. Click **Create**
6. The JSON file will be downloaded to your computer

### 4. Setup Credentials in Project

1. Rename the downloaded file to `google-credentials.json`
2. Copy it to `SuperMD/server/` directory
3. The file should be in the same directory as this guide

**File location**: `SuperMD/server/google-credentials.json`

### 5. Verify Setup

Your `google-credentials.json` should look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## ⚠️ Security Notes

**IMPORTANT**:
- ✅ The `google-credentials.json` file is **already in `.gitignore`**
- ✅ This file will **NOT be committed** to Git
- ✅ Keep this file **private** and **secure**
- ❌ **NEVER** share this file publicly or commit it to version control

## 📋 Alternative: Use Example Template

If you're setting up for the first time:

1. Copy `google-credentials.json.example` to `google-credentials.json`
2. Fill in your actual credentials from Google Cloud Console
3. Save the file

```bash
# Copy template
cp google-credentials.json.example google-credentials.json

# Edit with your credentials
# (Use your preferred text editor)
```

## 🔧 Environment Variables

You can also use environment variables instead of the JSON file:

```bash
# .env file
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
```

## 🐛 Troubleshooting

### Error: "google-credentials.json not found"

**Solution**: Make sure the file is in the correct location:
```
SuperMD/
└── server/
    ├── google-credentials.json  ← Should be here
    └── src/
```

### Error: "Invalid credentials"

**Solution**:
1. Verify the JSON format is correct
2. Check that the service account has the required permissions
3. Ensure the APIs are enabled in Google Cloud Console

### Error: "Permission denied"

**Solution**:
1. Go to Google Cloud Console
2. IAM & Admin > Service Accounts
3. Edit your service account
4. Grant necessary roles (Editor or specific API roles)

## 📚 Additional Resources

- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Creating and Managing Service Account Keys](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)
- [Custom Search JSON API](https://developers.google.com/custom-search/v1/overview)
