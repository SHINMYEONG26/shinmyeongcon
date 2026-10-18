(() => {
 const photos=window.PhotoService,client=photos?.client,table='site_inquiries';
 const statuses={received:'접수',in_progress:'확인 중',done:'완료'};
 function validate(values){
  if(values.website)throw Error('요청을 확인하지 못했습니다. 다시 시도해 주세요.');
  const name=String(values.name||'').trim(),phone=String(values.phone||'').trim(),message=String(values.message||'').trim(),category=String(values.category||'general');
  if(!name||name.length>80)throw Error('이름 또는 업체명을 80자 이내로 입력해 주세요.');
  const digits=phone.replace(/\D/g,'');if(!/^[+0-9() -]{7,30}$/.test(phone)||digits.length<7||digits.length>15)throw Error('연락 가능한 전화번호를 입력해 주세요.');
  if(category!=='general'&&!Object.hasOwn(photos?.labels||{},category))throw Error('문의 분야를 다시 선택해 주세요.');
  if(message.length<5||message.length>3000)throw Error('문의 내용을 5자 이상, 3,000자 이내로 입력해 주세요.');
  if(values.privacyConsent!==true)throw Error('상담을 위한 개인정보 수집·이용에 동의해 주세요.');
  return {name,phone,category,message,privacy_consent:true};
 }
 function failure(error){
  if(['42P01','PGRST205'].includes(error?.code))return Error('온라인 문의 접수함 연결이 아직 완료되지 않았습니다. 전화 010-7502-2856으로 문의해 주세요.');
  if(error?.code==='23505')return Error('같은 내용이 방금 접수되었습니다. 잠시 후 다시 문의해 주세요.');
  return Error('문의 처리를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');
 }
 window.InquiryService={ready:Boolean(client),statuses,validate,
  async submit(values){const record=validate(values);if(!client)throw Error('온라인 문의 연결을 확인해 주세요. 전화 010-7502-2856으로 상담할 수 있습니다.');const result=await client.from(table).insert(record);if(result.error)throw failure(result.error);},
  async list({status='all',offset=0}={}){await photos.requireAdmin();if(status!=='all'&&!Object.hasOwn(statuses,status))throw Error('문의 상태를 확인해 주세요.');if(!Number.isInteger(offset)||offset<0)throw Error('목록 위치를 확인해 주세요.');let query=client.from(table).select('id,name,phone,category,message,status,created_at').order('created_at',{ascending:false}).order('id',{ascending:false});if(status!=='all')query=query.eq('status',status);const result=await query.range(offset,offset+49);if(result.error)throw failure(result.error);return {items:result.data||[],hasMore:(result.data||[]).length===50};},
  async updateStatus(id,status){if(!/^[0-9a-f-]{36}$/i.test(id)||!Object.hasOwn(statuses,status))throw Error('처리 상태를 확인해 주세요.');await photos.requireAdmin();const result=await client.from(table).update({status}).eq('id',id).select('id').single();if(result.error||!result.data)throw failure(result.error);}
 };
})();
