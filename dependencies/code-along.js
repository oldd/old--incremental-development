const codeAlongGuide = `evaluate code: will run the code in the current editor ---
    ... capture asserts to display pass/fail
    ... try to stop your code after 1000+ loop iterations
    ... generate a search link for your errors
    ... indicate if errors were Creation or Execution phase
    ... remove all debugger statements
step through in debugger: will run the current editor ---
    ... insert a debugger statement before the first line
with infinite loop guard: will run the current editor ---
    ... like above, but will format your code
    ... try to insert an infinite loop guard at every loop
Open In Js Tutor: will open the current code in JS Tutor ---
    ... use this button ALL THE TIME!
Open In JSHint: opens your code in an online Linter that will ---
    ... point out syntax errors
    ... warn about some bad practices
    ... warn about possible runtime errors
    ... evaluate the complexity of your code
Format Code: will make code in the current editor prettier ---
    ... makes your code easier to read
`;

// - your code will be colored for easy reading
// - ctr-z will undo changes you made
// - ctr-shift-z will redo the changes
// - ctr-c will copy any highlighted text
// - ctr-v will paste the copied text
// - icons to the left of your code help with errors & syntax
// - changes ARE NOT saved when you refresh the web page
// - changes ARE saved when switching between exercises



async function codeAlong(config) {

  const container = (() => {
    if (!config) {
      return document.createElement('div');

    } if (config instanceof Element) {
      return config;

    } else if (typeof config === 'string') {
      return document.getElementById(config);

    } else if (!config.container) {
      return document.createElement('div');

    } else if (config.container instanceof Element) {
      return config.container;

    } else if (typeof config.container === 'string') {
      return document.getElementById(config.container);

    } else {
      throw new Error('unknown container');
    }
  })();


  const steps = [];

  const iframe = codeAlong.createIframe(config);

  const loadButton = document.createElement('button');
  loadButton.innerHTML = 'click to load code-along';
  loadButton.onclick = async () => {
    iframe.contentDocument.body.style = '';
    iframe.contentDocument.body.innerHTML = '';
    try {
      await new Promise((resolve, reject) => {
        const aceScript = document.createElement('script');
        aceScript.src = config.acePath ? config.acePath : "../dependencies/ace/ace.js";
        aceScript.type = "text/javascript";
        aceScript.charset = "utf-8";

        aceScript.addEventListener('load', () => {
          resolve();
          codeAlong.theRest(config, steps, iframe);
        });
        aceScript.addEventListener('error', (e) => reject(e.message))

        iframe.contentDocument.head.appendChild(aceScript);
      });
    } catch (err) {
      console.log(err);
      const error = document.createElement('code');
      error.innerHTML = 'could not reach internet or liveServer, unable to load code-along';
      error.style = 'position:absolute; position: fixed;top: 50%;left: 50%;transform: translate(-50%, -50%);text-align: center;';
      iframe.contentDocument.body.appendChild(error);
    };
  }

  const tempHeader = document.createElement('h1');
  tempHeader.innerHTML = config.title ? config.title : '';
  iframe.onload = () => {
    iframe.contentDocument.body.style = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;';
    iframe.contentDocument.body.appendChild(tempHeader);
    iframe.contentDocument.body.appendChild(loadButton);
  }

  container.appendChild(iframe);

  return { steps, container };

}

codeAlong.createIframe = () => {

  const iframe = document.createElement('iframe');
  iframe.style = 'height:93vh;width:100%;overflow:hidden;background-color:white;';
  iframe.setAttribute('scrolling', 'no');
  return iframe;

}

codeAlong.theRest = async (config, steps, iframe) => {
  const builtSteps = await (async () => {
    if (!config || !config.source) return [];

    const fetchSource = async path => {
      try {
        const res = await fetch(path);
        const code = res.text();
        return code;
      } catch (err) {
        return err.name + ": " + err.message;
      }
    }

    if (typeof config.source === 'string') {
      const code = await fetchSource(config.source);
      return [{
        code,
        path: config.source,
        name: config.name || 'code-along'
      }];
    } else if (Array.isArray(config.source)) {
      const fetched = config.source
        .map((path, ind) => {
          if (typeof path === 'string') {
            return {
              path,
              code: fetchSource(path),
              name: 'step ' + ind
            }
          } else if (path.constructor.name === "Object") {
            return {
              path,
              code: fetchSource(path.path),
              name: path.name || 'step ' + ind
            }
          } else {
            throw new Error('invalid step');
          }
        })
      for (let step of fetched) {
        step.code = await step.code;
      }
      return fetched;
    }
  })();

  builtSteps.forEach(step => steps.push(step));


  // async total side-effect
  if (config.type === 'document') {
    codeAlong.document(iframe, steps, config);
  } else if (config.type === 'js' || config.type === 'javascript') {
    codeAlong.js(iframe, steps, config);
  } else {
    codeAlong.js(iframe, steps, config);
  }

  // const setup = await codeAlong.setup(steps, config);
  // container.appendChild(setup);
}


codeAlong.document = (iframe, steps, config) => {
  const title = config.title;

  const stepsContainer = document.createElement('div');

  const editorContainer = document.createElement('div');
  editorContainer.style = 'height:98vh;width:55vw;';

  const ace = iframe.contentWindow.ace;
  // ace.require("ace/ext/language_tools"); // for code_lens eventually
  const editor = ace.edit(editorContainer);
  editor.setTheme('ace/theme/chrome');
  editor.setFontSize(12);
  editor.getSession().setMode('ace/mode/html');
  editor.getSession().setTabSize(2);

  if (steps.length === 0) {
    const defaultCode = "// https://developer.mozilla.org/en-US/docs/Web/API/Console/assert\n" +
      "console.assert(true, 'passing assert');\n" +
      "console.assert(false, 'failing assert');\n" +
      "\n// psst. Open your console for logging!";
    steps.push({
      code: defaultCode,
      name: 'default'
    })
  };

  steps.forEach(step => {
    step.session = ace.createEditSession(step.code, 'html');
    step.session.setMode('ace/mode/html');
  });

  if (steps.length > 1) {
    editorContainer.style = 'height:92vh;width:55vw;';
    const stepButtons = steps.map((step, index) => {
      const button = document.createElement('button');
      button.style.height = '5%'; // provisoire
      button.style.background = '';
      const name = step.name ? step.name : 'step ' + index;
      button.innerHTML = name;
      button.onclick = () => {

        active = step;
        stepButtons.forEach(stepButton => {
          stepButton.style.background = '';
        })
        button.style.background = 'darkgrey';

        editor.setSession(step.session);
        outputEl.src = "data:text/html;charset=utf-8," + encodeURIComponent(editor.getValue());

      }
      step.button = button;
      return button;
    });

    const buttonsContainer = steps
      .reduce((div, step) => {
        div.appendChild(step.button);
        return div;
      }, document.createElement('div'));
    stepsContainer.appendChild(buttonsContainer);

    steps[0].button.style.background = 'darkgrey';
  }

  stepsContainer.appendChild(editorContainer);

  editor.setSession(steps[0].session);
  editor.setValue(steps[0].code);

  const hixieButton = document.createElement('button');
  hixieButton.innerHTML = 'study in Live DOM Viewer';
  hixieButton.onclick = () => {
    const encodedHTML = encodeURIComponent(editor.getValue());
    const url = "https://software.hixie.ch/utilities/js/live-dom-viewer/?" + encodedHTML;
    window.open(url, "_blank");
  };

  const newTabButton = document.createElement('button');
  newTabButton.innerHTML = 'inspect/debug in new tab';
  newTabButton.onclick = () => {
    const x = window.open();
    x.document.open();
    x.document.write(editor.getValue());
    x.document.close();
  }


  const buttonDiv = document.createElement('div');
  buttonDiv.style = 'margin-top:2%;margin-bottom:2%;text-align:center;';
  buttonDiv.appendChild(newTabButton);
  buttonDiv.appendChild(hixieButton);


  const outputEl = document.createElement('iframe');
  // can do better than this
  config.title
    ? outputEl.style = "width:100%;height:85%;"
    : outputEl.style = "width:100%;height:90%;";
  outputEl.id = '\n-- study: rendered DOM --\n';
  outputEl.src = "data:text/html;charset=utf-8," + encodeURIComponent(steps[0].code);

  const outputContainer = document.createElement('div');
  outputContainer.style = 'height: 98vh; width: 45vw; border:solid 1px; padding-left:1%; padding-right:1%;';
  if (typeof title === 'string') {
    const titleEl = document.createElement('h1');
    titleEl.innerHTML = title;
    titleEl.style = 'text-align: center; margin-bottom:0%; margin-top:1%;';
    outputContainer.appendChild(titleEl);
  }
  outputContainer.appendChild(buttonDiv);
  outputContainer.appendChild(outputEl);

  editor.on("change", (e) => {
    outputEl.src = "data:text/html;charset=utf-8," + encodeURIComponent(editor.getValue());
  });


  iframe.contentDocument.body.style = 'display:flex; flex-direction:row;';
  iframe.contentDocument.body.appendChild(stepsContainer);
  iframe.contentDocument.body.appendChild(outputContainer);

}

