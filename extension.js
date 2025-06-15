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
      const match = line.match(/^([\w.-]+)\s*=\s*(.+)$/);
      if (match) {
        const key = match[1];
        const value = match[2];

        const startPos = new vscode.Position(lineIndex, key.length + 1);
        const endPos = new vscode.Position(lineIndex, line.length);

        const maskedValue = '*'.repeat(value.length);

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

  // 🆕 Toggle Command
  const toggleMaskingCommand = vscode.commands.registerCommand('env-masker.toggleMasking', () => {
    isMaskingEnabled = !isMaskingEnabled;
    vscode.window.showInformationMessage(
      isMaskingEnabled ? '✅ Env Masking Enabled' : '🚫 Env Masking Disabled'
    );
    updateAllVisibleEditors();
  });

  context.subscriptions.push(toggleMaskingCommand);

  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) maskSecrets(editor);
  });

  vscode.workspace.onDidOpenTextDocument(document => {
    const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
    if (editor) maskSecrets(editor);
  });

  vscode.workspace.onDidChangeTextDocument(event => {
    const editor = vscode.window.visibleTextEditors.find(e => e.document === event.document);
    if (editor) maskSecrets(editor);
  });

  if (vscode.window.activeTextEditor) {
    maskSecrets(vscode.window.activeTextEditor);
  }
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
