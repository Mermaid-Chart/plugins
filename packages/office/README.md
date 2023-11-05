# Mermaid Chart - Office Add In

Mermaid Chart add-in that allows users of Office to work with their Mermaid Chart diagrams directly within the app

- Excel
- OneNote
- PowerPoint
- Word

## Local development

### Requirements:

- [Yeoman generator for office](https://github.com/OfficeDev/generator-office) for office debugging
- [volta](https://volta.sh/) to manage node versions.
- [Node.js](https://nodejs.org/en/). `volta install node`
- [pnpm](https://pnpm.io/installation) package manager. `volta install pnpm`

### Local setup

- Switch to `office-addin` directory. `cd packages/office-addin`
- Install dependencies. `pnpm install`
- Start the app. `pnpm start`
- Select the office app
- Office will open with add-in loaded, pointing to [http://localhost:3000](http://localhost:3000)

> **Note:** Office Add-ins should use HTTPS, not HTTP, even when you are developing. If you are prompted to install a certificate after you run "pnpm start", accept the prompt to install the certificate that the Yeoman generator provides.
