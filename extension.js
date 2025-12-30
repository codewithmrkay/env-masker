const vscode = require('vscode');

let isMaskingEnabled = true;
let secretDecorationType;

function activate(context) {
  console.log('✅ Env Masker Activated');

  // Create decoration type ONCE at activation (reusing is faster)
  secretDecorationType = vscode.window.createTextEditorDecorationType({
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
      const match = line.match(/([\w.-]+)\s*=\s*(.*)/);

      if (match) {
        const value = match[2];

        if (!value || value.trim().length === 0) return;

        const equalIndex = line.indexOf('=');
        let actualValueStart = equalIndex + 1;

        while (actualValueStart < line.length && line[actualValueStart] === ' ') {
          actualValueStart++;
        }

        const startPos = new vscode.Position(lineIndex, actualValueStart);
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

  // Close all .env files
  async function closeAllEnvFiles() {
    const envTabs = vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .filter(tab => {
        const input = tab.input;
        return input?.uri?.fsPath?.match(/\.env(\..+)?$|\.env$/);
      });

    if (envTabs.length === 0) {
      vscode.window.showInformationMessage('No .env files open');
      return;
    }

    try {
      // ✅ Close ALL tabs in ONE call (atomic)
      await vscode.window.tabGroups.close(envTabs, true);

      vscode.window.showInformationMessage(
        `✅ Closed ${envTabs.length} .env file(s)`
      );
    } catch (err) {
      console.error('Failed to close env tabs:', err);
    }
  }


  // Toggle Masking Command
  const toggleMaskingCommand = vscode.commands.registerCommand('env-masker.toggleMasking', () => {
    isMaskingEnabled = !isMaskingEnabled;
    vscode.window.showInformationMessage(
      isMaskingEnabled ? '✅ Env Masking Enabled' : '🚫 Env Masking Disabled'
    );
    updateAllVisibleEditors();
  });

  context.subscriptions.push(toggleMaskingCommand);

  // Close All .env Files Command
  const closeAllEnvCommand = vscode.commands.registerCommand('env-masker.closeAllEnv', async () => {
    await closeAllEnvFiles();
  });

  context.subscriptions.push(closeAllEnvCommand);

  context.subscriptions.push(
    vscode.workspace.onDidRenameFiles(event => {
      event.files.forEach(({ newUri }) => {
        const editor = vscode.window.visibleTextEditors.find(
          e => e.document.uri.fsPath === newUri.fsPath
        );

        if (editor && editor.document.fileName.match(/\.env(\..+)?$|\.env$/)) {
          // 🔥 Mask immediately in same tick
          Promise.resolve().then(() => maskSecrets(editor));
        }
      });
    })
  );


  // INSTANT masking when active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        maskSecrets(editor); // Synchronous - no delay
      }
    })
  );

  // ULTRA FAST masking when document opens
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(document => {
      const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
      if (editor) {
        maskSecrets(editor); // Immediate synchronous call
      }
    })
  );

  // Real-time masking while typing
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      const editor = vscode.window.visibleTextEditors.find(e => e.document === event.document);
      if (editor) {
        maskSecrets(editor);
      }
    })
  );



  // CRITICAL: AGGRESSIVE immediate masking on extension load
  const immediatelyMaskAll = () => {
    vscode.window.visibleTextEditors.forEach(editor => {
      if (editor.document.fileName.match(/\.env(\..+)?$|\.env$/)) {
        maskSecrets(editor);
      }
    });
  };

  // SUPER AGGRESSIVE: Run masking in tight loop
  for (let i = 0; i < 10; i++) {
    immediatelyMaskAll();
  }

  // Also run on every possible event loop tick
  process.nextTick(() => {
    for (let i = 0; i < 5; i++) {
      immediatelyMaskAll();
    }
  });

  // Flood with immediate calls
  setImmediate(() => {
    for (let i = 0; i < 5; i++) {
      immediatelyMaskAll();
    }
  });

  // Time-based safety nets
  [0, 1, 5, 10, 20, 30, 50, 100].forEach(delay => {
    setTimeout(() => immediatelyMaskAll(), delay);
  });
}

function deactivate() {
  if (secretDecorationType) {
    secretDecorationType.dispose();
  }
}

module.exports = {
  activate,
  deactivate
};