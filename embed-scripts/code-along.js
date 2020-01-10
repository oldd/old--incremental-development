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

  const steps = await (async () => {
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

  console.log(steps)
  // { iframe  }
  const setup = await codeAlong.setup(steps, config.title);
  container.appendChild(setup);


  return { steps, container };


}

codeAlong.setup = async (steps, title) => {

  const result = {};

  const iframe = document.createElement('iframe');
  iframe.style = 'height:90vh;width:100%;overflow:hidden;background-color:white;';
  // iframe.setAttribute('scrolling', 'no');
  result.iframe = iframe;


  iframe.onload = async () => {

    await new Promise((resolve, reject) => {
      const aceScript = document.createElement('script');
      aceScript.src = "../embed-scripts/ace/ace.js";
      aceScript.type = "text/javascript";
      aceScript.charset = "utf-8";

      aceScript.addEventListener('load', () => resolve());
      aceScript.addEventListener('error', (e) => reject(e.message))

      iframe.contentDocument.head.appendChild(aceScript);
    });


    const stepsContainer = document.createElement('div');

    const editorContainer = document.createElement('div');
    editorContainer.style = 'height:100vh;width:55vw;';

    const ace = iframe.contentWindow.ace;
    const editor = ace.edit(editorContainer);
    editor.setTheme('ace/theme/dracula');
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
      const stepButtons = steps.map((step, index) => {
        const button = document.createElement('button');
        const name = step.name ? step.name : 'step ' + index;
        button.innerHTML = name;
        // clear the results when tabs are switched
        //  avoid students changing code but not evaluating, switching tabs, then back and not remembering the results are out of date, then being confused by the wrong results.
        // step.results = document.createElement('div');
        button.onclick = () => {

          active = step;
          // console.clear();
          stepButtons.forEach(stepButton => {
            stepButton.innerHTML = stepButton.innerHTML
              .replace('---&gt; ', '')
              .replace(' &lt;---', '');
          })
          button.innerHTML = '---> ' + button.innerHTML + ' <---';

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

      steps[0].button.innerHTML = '---> ' + steps[0].name + ' <---';
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
    newTabButton.innerHTML = 'inspect in new tab';
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
    outputEl.style = "width:37vw;height:82vh;margin-right:3%;";
    outputEl.id = '\n-- study: rendered DOM --\n';
    outputEl.src = "data:text/html;charset=utf-8," + encodeURIComponent(steps[0].code);

    const outputContainer = document.createElement('div');
    outputContainer.style = 'height: 100vh; width: 40vw; border:solid 1px; padding-left:3%; padding-right:3%;';
    if (typeof title === 'string') {
      const titleEl = document.createElement('h3');
      titleEl.innerHTML = title;
      titleEl.style = 'text-align: center;';
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

  return iframe;

}


// {
//   const configSchema = {
//     container: 'string, element, empty',
//     title: 'string, to become a main header',
//     source: 'undefined -> empty code-along. string -> fetch from relative path. object -> name & path. array of strings or objects -> tabbed the-previous-things'
//   }

//   const resultSchema = {
//     config: 'the unmodified config object',
//     container: "element with input & output containers",
//     editor: 'ace editor',
//     resultsEl: 'coupler',
//     active: "the active step object",
//     steps: {
//       type: 'array',
//       description: 'if no steps, empty editor/results. if 1 step, no tabs. if 2+ steps, tab-it',
//       items: {
//         path: "relative path to file",
//         code: "the code",
//         session: "ace session",
//         name: "given or default name "
//       }
//     }
//   }
// }


