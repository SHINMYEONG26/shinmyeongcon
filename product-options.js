(() => {
  const axes = [['color', '색상'], ['thickness', '두께'], ['length', '길이']];
  const units = ['원/장', '원/㎡', '원/m', '원/개', '원/세트'];
  function normalize(rows = []) {
    if (!Array.isArray(rows) || rows.length > 100) throw new Error('옵션은 최대 100개까지 입력해 주세요.');
    const seen = new Set();
    return rows.map(row => {
      const result = {};
      for (const [key, label] of axes) {
        result[key] = String(row[key] ?? '').trim();
        if (result[key].length > 60) throw new Error(label + '은 60자 이하로 입력해 주세요.');
      }
      const price = row.price;
      result.price = price === '' || price === null || price === undefined ? null : Number(price);
      if (result.price !== null && (!Number.isSafeInteger(result.price) || result.price < 0 || result.price > 9999999999)) {
        throw new Error('가격은 0 이상 9,999,999,999 이하의 정수로 입력해 주세요.');
      }
      const key = JSON.stringify(axes.map(([axis]) => result[axis]));
      if (seen.has(key)) throw new Error('색상·두께·길이가 같은 옵션이 중복되어 있습니다.');
      seen.add(key);
      return result;
    });
  }
  function priceText(price, unit) {
    return price === null || price === undefined ? '가격 문의' : new Intl.NumberFormat('ko-KR').format(price) + (units.includes(unit) ? ' ' + unit : ' 원/장');
  }
  function mount(container, product) {
    let rows;
    try { rows = normalize(product.variants || []); } catch { rows = []; }
    const options = document.createElement('div');
    options.className = 'product-options';
    const selectors = [];
    const activeAxes = axes.filter(([key]) => rows.some(row => row[key]));
    for (const [key, defaultLabel] of activeAxes) {
      const values=rows.map(row=>row[key]).filter(Boolean);
      const names=values.map(value=>value.includes(': ')?value.split(': ')[0]:null);
      const label=names.length&&names.every(name=>name&&name===names[0])?names[0]:defaultLabel;
      const field = document.createElement('label');
      field.textContent = label;
      const select = document.createElement('select');
      select.setAttribute('aria-label', product.title + ' ' + label + ' 선택');
      field.append(select); options.append(field); selectors.push({ key, label, select });
    }
    const summary = document.createElement('p');
    summary.className = 'product-option-summary';
    const price = document.createElement('p');
    price.className = 'product-price'; price.setAttribute('aria-live', 'polite');
    function updatePrice() {
      const complete = selectors.every(({ select }) => select.value !== '');
      if (!complete) {
        summary.textContent = '색상·두께·길이 옵션을 선택해 주세요.';
        price.textContent = '옵션 선택 후 가격 확인'; container.dispatchEvent(new CustomEvent('product-price-change',{detail:{complete:false,price:null,summary:''}})); return;
      }
      const matching = rows.find(row => selectors.every(({ key, select }) => row[key] === JSON.parse(select.value)));
      summary.textContent = selectors.length ? selectors.map(({ label, select }) => label + ' ' + (select.selectedOptions[0]?.textContent || select.value)).join(' · ') : '상품 가격';
      price.textContent = priceText(matching?.price, product.price_unit);
      container.dispatchEvent(new CustomEvent('product-price-change',{detail:{complete:true,price:matching?.price??null,summary:summary.textContent}}));
    }
    function populate(from) {
      for (let i = from; i < selectors.length; i++) {
        const { key, label, select } = selectors[i];
        select.replaceChildren();
        const placeholder = document.createElement('option');
        placeholder.value = ''; placeholder.textContent = label + ' 선택'; select.append(placeholder);
        const preceding = selectors.slice(0, i);
        const candidates = rows.filter(row => preceding.every(({ key: axis, select: parent }) => parent.value && row[axis] === JSON.parse(parent.value)));
        const values = [...new Set(candidates.map(row => row[key]))];
        for (const value of values) {
          const option = document.createElement('option');
          option.value = JSON.stringify(value); option.textContent = value.startsWith(label+': ')?value.slice(label.length+2):(value || '기본'); select.append(option);
        }
        select.disabled = preceding.some(({ select: parent }) => !parent.value);
        if (!select.disabled && values.length === 1) select.value = JSON.stringify(values[0]);
      }
      updatePrice();
    }
    selectors.forEach(({ select }, index) => select.addEventListener('change', () => populate(index + 1)));
    if (selectors.length) { options.append(summary); container.append(options); populate(0); }
    else { summary.textContent = ''; updatePrice(); }
    container.append(price);
  }
  window.ProductOptions = { axes, units, normalize, priceText, mount };
})();
