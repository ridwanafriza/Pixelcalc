/* app.js
   Vanilla JS calculator logic with memory, history, keyboard support, theme, tutorial, and PWA-friendly localStorage usage.
*/

(() => {
  // Elements
  const mainDisplay = document.getElementById('main-display');
  const subDisplay = document.getElementById('sub-display');
  const buttons = document.querySelectorAll('[data-value], [data-action]');
  const historyEl = document.getElementById('history');
  const coin = document.getElementById('coin-sound');

  // State
  let expr = '';          // raw displayed expression
  let subExpr = '';       // secondary display
  let memory = Number(localStorage.getItem('calc_memory') || 0);
  let history = JSON.parse(localStorage.getItem('calc_history') || '[]');
  let tutorialDisabled = localStorage.getItem('calc_tutorial_off') === '1';
  let theme = localStorage.getItem('calc_theme') || 'night';

  // Util functions
  function playCoin(){ if(coin && coin.play) { coin.currentTime = 0; coin.play().catch(()=>{}); } }
  function updateDisplays(){
    mainDisplay.textContent = expr || '0';
    subDisplay.textContent = subExpr || '';
  }
  function pushHistory(item){
    history.unshift(item);
    if(history.length > 50) history.pop();
    localStorage.setItem('calc_history', JSON.stringify(history));
    renderHistory();
  }
  function renderHistory(){
    historyEl.innerHTML = '';
    history.forEach(h=>{
      const div = document.createElement('div');
      div.className = 'p-2 mb-1 rounded hover:bg-white/5 cursor-pointer';
      div.textContent = `${h.input} = ${h.result}`;
      div.addEventListener('click', ()=> {
        expr = String(h.result);
        updateDisplays();
      });
      historyEl.appendChild(div);
    });
  }

  // FACTORIAL handler
  function factorial(n){
    n = Math.floor(n);
    if(n < 0) return NaN;
    if(n === 0 || n === 1) return 1;
    let res = 1;
    for(let i=2;i<=n;i++) res *= i;
    return res;
  }

  // Evaluate expression safely with token replacements.
  function safeEvaluate(input){
    // Replace unicode operators with JS ones
    let s = String(input);

    // Prevent dangerous letters - allow only digits, . , parentheses, operators, letters in function map
    // We'll map known function names to Math equivalents.
    // Replace percent: '5%' => (5/100)
    s = s.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');

    // Handle factorial: find n! occurrences
    s = s.replace(/(\d+(\.\d+)?)!/g, (m, p1) => {
      const val = factorial(Number(p1));
      return `(${val})`;
    });

    // Mapping functions and constants
    const map = {
      'π':'Math.PI',
      'pi':'Math.PI',
      'e':'Math.E',
      'sin(': 'Math.sin(',
      'cos(': 'Math.cos(',
      'tan(': 'Math.tan(',
      'asin(': 'Math.asin(',
      'acos(': 'Math.acos(',
      'atan(': 'Math.atan(',
      'log(': 'Math.log10(',
      'ln(': 'Math.log(',
      '√':'Math.sqrt',
      '×':'*',
      '÷':'/'
    };

    // Replace keys (longer keys first)
    const keys = Object.keys(map).sort((a,b)=>b.length-a.length);
    keys.forEach(k=>{
      const re = new RegExp(k.replace(/([.*+?^=!:${}()|\[\]\/\\])/g,"\\$1"), 'g');
      s = s.replace(re, map[k]);
    });

    // Handle xʸ: user flow adds a special token like 'POW(' and ')', but we implement xʸ button to append '^' char
    // If caret '^' present, convert to Math.pow
    s = s.replace(/([0-9\)\.e]+)\^([0-9\(\.\-e]+)/g, 'Math.pow($1,$2)');

    // Final safety check: allow only numbers, Math., parentheses, operators and commas
    if(/[^0-9Math\.\+\-\*\/\^\(\),%ePIlogasinctanrpow]/i.test(s)){
      // fallback: refuse
      throw new Error('Invalid characters in expression');
    }

    // Use Function to evaluate
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${s});`);
      const result = fn();
      if(typeof result === 'number' && !isFinite(result)) throw new Error('Math error');
      return result;
    } catch (err){
      throw err;
    }
  }

  // Button actions
  function handleAction(action, value){
    playCoin();
    switch(action){
      case 'mc':
        memory = 0; localStorage.setItem('calc_memory', '0'); flashMessage('Memory cleared');
        break;
      case 'mr':
        expr = String(memory); updateDisplays();
        break;
      case 'ms':
        memory = Number(mainDisplay.textContent) || 0; localStorage.setItem('calc_memory', String(memory)); flashMessage('Stored to memory');
        break;
      case 'mplus':
        memory = (Number(memory) + Number(mainDisplay.textContent || 0)); localStorage.setItem('calc_memory', String(memory)); flashMessage('Added to memory');
        break;
      case 'percent':
        try {
          const res = safeEvaluate(expr + '%');
          expr = String(res); pushHistory({input: expr+'%', result: res}); updateDisplays();
        } catch (e){ showError(e.message); }
        break;
      case 'neg':
        if(expr.startsWith('-')) expr = expr.slice(1); else expr = expr ? '-'+expr : expr;
        updateDisplays();
        break;
      case 'clear':
        expr = ''; subExpr = ''; updateDisplays();
        break;
      case 'fact':
        // append factorial operator (!) to number
        expr += '!';
        updateDisplays();
        break;
      case 'sqrt':
        expr = `Math.sqrt(${expr || '0'})`; updateDisplays();
        break;
      case 'pow2':
        expr = `Math.pow(${expr || '0'},2)`; updateDisplays();
        break;
      case 'pow3':
        expr = `Math.pow(${expr || '0'},3)`; updateDisplays();
        break;
      case 'pow':
        // indicate user to type ^ for exponent
        expr += '^';
        updateDisplays();
        break;
      case 'pi':
        expr += 'π';
        updateDisplays();
        break;
      case 'e':
        expr += 'e';
        updateDisplays();
        break;
      case 'equals':
        try {
          const inputToEval = expr;
          const result = safeEvaluate(inputToEval);
          subExpr = inputToEval;
          expr = String(result);
          updateDisplays();
          pushHistory({input: inputToEval, result});
          showSuccess('Calculated');
        } catch (err){
          showError(err.message || 'Invalid expression');
        }
        break;
      default:
        // default fallback
        break;
    }
  }

  // Visual helpers
  function flashMessage(msg){
    subDisplay.textContent = msg;
    setTimeout(()=>{ subDisplay.textContent = ''; }, 1200);
  }
  function showError(msg){
    subDisplay.textContent = 'Mario says: ' + msg;
    mainDisplay.textContent = 'ERR';
    setTimeout(()=>{
      subDisplay.textContent = '';
      mainDisplay.textContent = expr || '0';
    }, 1600);
  }
  function showSuccess(msg){
    subDisplay.textContent = msg;
    setTimeout(()=> subDisplay.textContent = '', 1000);
  }

  // Click handlers
  buttons.forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const val = btn.getAttribute('data-value');
      const action = btn.getAttribute('data-action');
      if(val !== null){
        // value button
        expr += val;
        updateDisplays();
        playCoin();
      } else if(action){
        handleAction(action);
      }
    });
  });

  // Keyboard support
  window.addEventListener('keydown', (e)=>{
    const key = e.key;
    if((/^[0-9+\-*/().]$/).test(key)){
      // adapt * and / to display as × ÷ optionally
      if(key === '*') expr += '×';
      else if(key === '/') expr += '÷';
      else expr += key;
      updateDisplays();
      e.preventDefault();
      return;
    }
    if(key === 'Enter') { handleAction('equals'); e.preventDefault(); return; }
    if(key === 'Backspace'){
      expr = expr.slice(0, -1); updateDisplays(); e.preventDefault(); return;
    }
    if(key === 'c' || key === 'C'){ handleAction('clear'); return; }
    if(key === 'm'){ handleAction('ms'); return; } // quick store
    if(key === 'r'){ handleAction('mr'); return; } // recall
    if(key === 'p'){ handleAction('pi'); return; } // pi
  });

  // tutorial overlay logic
  const tut = document.getElementById('tutorial');
  document.getElementById('open-tutorial').addEventListener('click', ()=> {
    tut.classList.remove('hidden'); tut.classList.add('flex');
  });
  document.getElementById('close-tutorial').addEventListener('click', ()=> { tut.classList.add('hidden'); });
  document.getElementById('dont-show').addEventListener('click', ()=> {
    localStorage.setItem('calc_tutorial_off', '1'); tut.classList.add('hidden');
  });

  // theme toggle
  const toggleTheme = document.getElementById('toggle-theme');
  function applyTheme(t){
    document.body.classList.remove('theme-day','theme-night');
    document.body.classList.add(t === 'day' ? 'theme-day' : 'theme-night');
    localStorage.setItem('calc_theme', t);
  }
  toggleTheme.addEventListener('click', ()=>{
    theme = theme === 'night' ? 'day' : 'night';
    applyTheme(theme);
  });
  applyTheme(theme);

  // small ONLOAD init
  function init(){
    renderHistory();
    if(!tutorialDisabled){
      tut.classList.remove('hidden'); tut.classList.add('flex');
    }
    updateDisplays();
  }

  // expose some debug helpers (optional)
  window.calcApp = { safeEvaluate, factorial };

  init();
})();
