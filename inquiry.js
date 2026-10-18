(() => {
 const form=document.getElementById('inquiry-form'),status=document.getElementById('inquiry-status'),success=document.getElementById('inquiry-success'),service=window.InquiryService;if(!form)return;
 const fields=form.querySelector('fieldset'),button=form.querySelector('[type=submit]');let busy=false;
 const params=new URLSearchParams(location.search),product=(params.get('product')||'').slice(0,80),selection=(params.get('selection')||'').slice(0,500),category=params.get('category');
 if(category&&[...form.elements.category.options].some(o=>o.value===category))form.elements.category.value=category;
 if(product)form.elements.message.value=('상품: '+product+'\n'+(selection?'선택 규격: '+selection+'\n':'')+'\n문의 내용: ').slice(0,3000);
 function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
 form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const values={name:form.elements.name.value,phone:form.elements.phone.value,category:form.elements.category.value,message:form.elements.message.value,privacyConsent:form.elements.privacyConsent.checked,website:form.elements.website.value};try{if(!service)throw Error('온라인 문의 연결을 확인해 주세요.');service.validate(values);busy=true;fields.disabled=true;button.textContent='접수 중…';message('문의를 접수하고 있습니다.');await service.submit(values);form.reset();form.hidden=true;success.hidden=false;message('');success.focus();}catch(error){message(error.message||'문의를 접수하지 못했습니다. 다시 시도해 주세요.',true);status.focus();}finally{busy=false;fields.disabled=false;button.textContent='문의 접수하기';}});
 document.getElementById('inquiry-again').addEventListener('click',()=>{success.hidden=true;form.hidden=false;message('');form.elements.name.focus();});
 window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
})();
