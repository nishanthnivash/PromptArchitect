
# PromptArchitect

Turn raw thoughts into high-performance AI instructions. 

PromptArchitect is a professional prompt engineering studio designed to bridge the gap between messy human ideas and structured LLM instructions. Using Gemini 2.5 Flash, it detects intent and architects four distinct prompt styles (Persona, Chain-of-Thought, Technical, and Marketing) with automated quality scoring.

## Repository
[https://github.com/nishanthnivash/PromptArchitect](https://github.com/nishanthnivash/PromptArchitect)

## Features
- **Raw Thought Processing**: Input natural language and let AI identify your core intent.
- **Multi-Style Architecture**: Instant generation of four specialized prompt formats.
- **Dynamic Scoring**: Detailed metrics for Clarity, Specificity, and Quality with AI-driven reasoning.
- **Prompt Library**: Save, star, and manage your engineered prompts in a personal workspace.
- **Developer Studio**: Customizable profile and developer card for AI engineers.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **AI Engine**: Genkit + Gemini 2.5 Flash
- **Database/Auth**: Firebase Firestore & Firebase Auth
- **UI/UX**: Tailwind CSS + ShadCN UI + Lucide Icons

## Getting Started
1. Clone the repo: `git clone https://github.com/nishanthnivash/PromptArchitect.git`
2. Install dependencies: `npm install`
3. Configure your `.env` with Firebase and Gemini API keys.
4. Run development server: `npm run dev`

## Git Troubleshooting (403 Error)
If you get a `Permission denied` (403) error when pushing:
1. **Invite as Collaborator**: Go to `nishanthnivash/PromptArchitect` > Settings > Collaborators and invite `nishanthrocky756-nis`.
2. **Update Local User**: Run these in your terminal:
   ```bash
   git config user.name "nishanthnivash"
   git config user.email "your-email@example.com"
   ```
3. **Use Personal Access Token**: If prompted for a password, use a GitHub PAT instead of your account password.
