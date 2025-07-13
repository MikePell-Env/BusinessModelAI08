# PowerPoint to Business Model Canvas Import Guide

## Overview

The Business Model Canvas application supports importing business model data directly from PowerPoint presentations using Microsoft Graph API integration. This feature allows you to convert structured PowerPoint slides into interactive 2D and 3D business model visualizations.

## Supported Import Methods

### 1. Microsoft Graph API Import (Recommended)
- Uses your existing Azure credentials
- Works with OneDrive and SharePoint files
- Automatic text extraction and parsing
- Real-time import with error handling

### 2. File Upload (Future Enhancement)
- Direct file upload from local computer
- Client-side PowerPoint parsing
- Currently in development

## PowerPoint Template Format

### Option 1: Multi-Slide Format (Recommended)

Create **10 slides** with the following exact structure:

#### Slide 1: Cover Slide
- **Title**: Your Business Model Canvas Name
- **Content**: Brief description of your business

#### Slide 2: Key Partners
- **Title**: "Key Partners" (exact text)
- **Content**: Bullet points with each partner/supplier
- Example:
  ```
  • Cloud infrastructure providers (AWS, Azure)
  • Technology vendors and software suppliers
  • Strategic investment partners and VCs
  ```

#### Slide 3: Key Activities
- **Title**: "Key Activities" (exact text)
- **Content**: Bullet points with each key activity
- Example:
  ```
  • Software development and engineering
  • Product research and innovation
  • Customer acquisition and marketing
  ```

#### Slide 4: Key Resources
- **Title**: "Key Resources" (exact text)
- **Content**: Bullet points with each key resource

#### Slide 5: Value Propositions
- **Title**: "Value Propositions" (exact text)
- **Content**: Bullet points with each value proposition

#### Slide 6: Customer Relationships
- **Title**: "Customer Relationships" (exact text)
- **Content**: Bullet points with each relationship type

#### Slide 7: Channels
- **Title**: "Channels" (exact text)
- **Content**: Bullet points with each channel

#### Slide 8: Customer Segments
- **Title**: "Customer Segments" (exact text)
- **Content**: Bullet points with each customer segment

#### Slide 9: Cost Structure
- **Title**: "Cost Structure" (exact text)
- **Content**: Bullet points with each cost category

#### Slide 10: Revenue Streams
- **Title**: "Revenue Streams" (exact text)
- **Content**: Bullet points with each revenue source

### Option 2: Single Slide Format

Create **one slide** with 9 labeled text boxes:
- Each text box should have a clear title (e.g., "Key Partners:")
- Follow with bullet points for content
- Arrange text boxes to match the business model canvas layout

## Formatting Guidelines

### Title Requirements
- Use **exact titles** as specified above for automatic recognition
- Titles are case-insensitive but should match the words exactly
- Alternative accepted titles:
  - "Value Proposition" (singular) → maps to "Value Propositions"
  - "Revenue Stream" (singular) → maps to "Revenue Streams"

### Content Formatting
- Use consistent bullet points (•, -, or numbers)
- Each bullet point becomes one item in the canvas
- Keep bullet points concise and clear
- Avoid special characters that might interfere with parsing
- Empty sections will display "(No content provided)"

### Best Practices
- **Consistent formatting**: Use the same bullet style throughout
- **Clear content**: Write descriptive but concise bullet points
- **Logical grouping**: Group related items under the same section
- **Avoid duplicates**: Don't repeat the same content across sections

## Import Process

### Step 1: Prepare PowerPoint File
1. Create your PowerPoint presentation using the template format above
2. Save the file to **OneDrive** or **SharePoint**
3. Note the file location for ID extraction

### Step 2: Get File ID
1. Open your PowerPoint file in OneDrive or SharePoint
2. Copy the **File ID** from the URL or use Microsoft Graph Explorer
3. For SharePoint files, also get the **Site ID**

### Step 3: Import into Application
1. Open the Business Model Canvas application
2. Click **"Import from PowerPoint"** button
3. Enter the **File ID** (required)
4. Enter the **Site ID** (optional, for SharePoint files)
5. Click **"Import from Microsoft Graph"**

### Step 4: Review and Edit
1. The imported canvas will automatically load
2. Review the imported content in both 2D and 3D views
3. Use the AI chat to refine and optimize your business model
4. Make manual edits as needed

## Getting File and Site IDs

### OneDrive Files
```
URL: https://onedrive.live.com/?id=ABC123...
File ID: ABC123...
Site ID: Not required
```

### SharePoint Files
```
URL: https://yourcompany.sharepoint.com/sites/sitename/Shared%20Documents/file.pptx
Use Microsoft Graph Explorer to get IDs:
File ID: {file-guid}
Site ID: {site-guid}
```

### Using Microsoft Graph Explorer
1. Go to [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Sign in with your Microsoft account
3. Use these queries to find your files:
   ```
   GET /me/drive/root/children
   GET /sites/{site-id}/drive/root/children
   ```

## Error Handling

### Common Issues and Solutions

#### "File not found"
- Verify the File ID is correct
- Ensure you have access to the file
- Check if the file is in OneDrive vs SharePoint

#### "Access denied"
- Confirm your Microsoft Graph permissions
- Ensure the file sharing settings allow access
- Verify your Azure credentials are properly configured

#### "Parsing failed"
- Check that slide titles match exactly
- Ensure bullet points are properly formatted
- Verify the PowerPoint file isn't corrupted

#### "No content imported"
- Confirm slides contain bullet-point content
- Check that titles are recognized section names
- Review the template format requirements

## Advanced Features

### Canvas Customization
After import, you can:
- Modify colors for each section
- Add or remove content items
- Use AI chat for business model optimization
- Export to different formats

### Integration with Microsoft Stack
- Leverages existing Azure/Microsoft 365 credentials
- Seamless integration with OneDrive and SharePoint
- Future enhancements will include:
  - Microsoft Teams integration
  - PowerBI analytics
  - Microsoft Fabric data connections

## Example Template

Here's a sample PowerPoint structure for a tech startup:

**Slide 1: TechCorp Business Model**
"Innovative SaaS platform for enterprise automation"

**Slide 2: Key Partners**
```
• Cloud infrastructure providers (AWS, Azure)
• Technology integration partners
• Strategic investors and VCs
• Academic research institutions
```

**Slide 3: Key Activities**
```
• AI model development and training
• Software development and testing
• Customer support and success
• Research and development
```

[Continue for all 9 sections...]

## Support and Troubleshooting

### Need Help?
- Use the AI chat feature for business model guidance
- Check the Microsoft Stack Status for connectivity issues
- Review the template instructions in the import dialog

### Technical Support
- Ensure Microsoft Graph API access is properly configured
- Verify Azure credentials and permissions
- Check network connectivity to Microsoft services

## Future Enhancements

### Planned Features
- **File Upload Support**: Direct PowerPoint file upload
- **Template Gallery**: Pre-built industry-specific templates
- **Batch Import**: Import multiple business models at once
- **Export to PowerPoint**: Generate presentation from canvas
- **Advanced Parsing**: Support for images, charts, and complex layouts

### Integration Roadmap
- Microsoft Teams collaboration features
- PowerBI dashboard generation
- Microsoft Fabric data integration
- Office 365 workflow automation