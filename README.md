# Business Model Canvas Visualization Application

An AI-powered web application that transforms 2D business model canvases into interactive 3D experiences with intelligent business analysis capabilities.

## Features

- **Dual Visualization**: Switch between traditional 2D canvas and immersive 3D visualization
- **AI Assistant**: Chat with Microsoft Copilot and OpenAI for business model insights
- **Interactive 3D**: Click on canvas elements to view detailed information panels
- **Professional UI**: Clean, responsive design with Microsoft Copilot branding
- **Real-time Analysis**: Get AI-powered suggestions and business optimization tips

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **3D Rendering**: Babylon.js for Microsoft technology alignment
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **UI**: Radix UI + Tailwind CSS
- **AI**: Microsoft Copilot API + OpenAI API
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key
- Microsoft Azure credentials (optional, for Copilot features)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd business-model-canvas
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- `OPENAI_API_KEY`: Your OpenAI API key
- `DATABASE_URL`: PostgreSQL connection string
- `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`: Microsoft Graph API credentials (optional)

4. Run database migrations:
```bash
npm run db:migrate
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── lib/         # Utilities and stores
│   │   ├── types/       # TypeScript definitions
│   │   └── data/        # Sample canvas data
├── server/              # Express backend
│   ├── services/        # AI and authentication services
│   └── routes.ts        # API endpoints
├── shared/              # Shared TypeScript schemas
└── docs/               # Documentation

```

## Usage

1. **View Canvas**: The app loads with a sample technology startup canvas
2. **Switch Views**: Use the 2D/3D buttons to toggle visualization modes
3. **Explore 3D**: Click on any canvas section in 3D view for detailed information
4. **AI Chat**: Open the chat assistant to ask questions about your business model
5. **Get Insights**: Ask for suggestions like "Analyze my value proposition" or "Suggest improvements"

## Environment Variables

Create a `.env` file in the root directory:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Optional - Microsoft Graph API
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or support, please open an issue in the GitHub repository.