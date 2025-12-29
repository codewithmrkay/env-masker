const vscode = require('vscode');

let isMaskingEnabled = true;

function activate(context) {
  console.log('✅ Env Masker Activated');

  const secretDecorationType = vscode.window.createTextEditorDecorationType({
    color: 'transparent',
    letterSpacing: '-1ch',
  });

  function maskSecrets(editor) {
    if (!editor || !editor.document || !isMaskingEnabled) {
      editor?.setDecorations(secretDecorationType, []);
      return;
    }

    const fileName = editor.document.fileName;
    if (!fileName.match(/\.env(\..+)?$|\.env$/)) return;

    const text = editor.document.getText();
    const decorations = [];

    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
      // Updated regex to match commented lines as well
      // Supports: KEY=value, #KEY=value, # KEY=value, //KEY=value, // KEY=value
      const match = line.match(/^\s*(#|\/\/)?\s*([\w.-]+)\s*=\s*(.+)$/);
      
      if (match) {
        const commentPrefix = match[1] || '';
        const key = match[2];
        const value = match[3];

        // Calculate the position after the '=' sign
        const equalSignIndex = line.indexOf('=');
        const startPos = new vscode.Position(lineIndex, equalSignIndex + 1);
        const endPos = new vscode.Position(lineIndex, line.length);

        const maskedValue = '*'.repeat(value.trim().length);

        decorations.push({
          range: new vscode.Range(startPos, endPos),
          renderOptions: {
            after: {
              contentText: maskedValue,
              color: '#888',
              margin: '0 0 0 5px',
            },
          },
        });
      }
    });

    editor.setDecorations(secretDecorationType, decorations);
  }

  function updateAllVisibleEditors() {
    vscode.window.visibleTextEditors.forEach(maskSecrets);
  }

  // Apply masking immediately when extension loads
  // This reduces the "flash" of unmasked content
  function applyInitialMasking() {
    if (vscode.window.activeTextEditor) {
      maskSecrets(vscode.window.activeTextEditor);
    }
    vscode.window.visibleTextEditors.forEach(maskSecrets);
  }

  // Toggle Command
  const toggleMaskingCommand = vscode.commands.registerCommand('env-masker.toggleMasking', () => {
    isMaskingEnabled = !isMaskingEnabled;
    vscode.window.showInformationMessage(
      isMaskingEnabled ? '✅ Env Masking Enabled' : '🚫 Env Masking Disabled'
    );
    updateAllVisibleEditors();
  });

  context.subscriptions.push(toggleMaskingCommand);

  // Event listeners
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) maskSecrets(editor);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(document => {
      const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
      if (editor) {
        // Apply masking immediately without delay
        maskSecrets(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      const editor = vscode.window.visibleTextEditors.find(e => e.document === event.document);
      if (editor) maskSecrets(editor);
    })
  );

  // Apply masking immediately on activation (fixes flash issue)
  applyInitialMasking();
  
  // Additional safeguard: reapply after a tiny delay to catch any race conditions
  setTimeout(() => {
    updateAllVisibleEditors();
  }, 50);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};