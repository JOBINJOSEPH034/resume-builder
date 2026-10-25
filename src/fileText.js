export async function readDocumentText(file) {
  if (!file || file.size>5*1024*1024) throw new Error('Choose a document smaller than 5 MB.');
  let text='';
  if (/\.txt$/i.test(file.name)) text=await file.text();
  else if (/\.docx$/i.test(file.name)) {
    const mammoth=await import('mammoth');
    text=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;
  } else if (/\.pdf$/i.test(file.name)) {
    const [pdfjs,{default:worker}]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
    pdfjs.GlobalWorkerOptions.workerSrc=worker;
    const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
    try {
      if(pdf.numPages>30) throw new Error('Use a document with at most 30 pages.');
      for(let page=1;page<=pdf.numPages;page++) {
        const items=(await (await pdf.getPage(page)).getTextContent()).items;
        text+=items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('')+'\n';
        if(text.length>20000) throw new Error('Use a document with less than 20,000 characters.');
      }
    } finally {await pdf.destroy();}
  } else throw new Error('Use a PDF, DOCX or TXT document.');
  if(text.length>20000) throw new Error('Use a document with less than 20,000 characters.');
  if(text.trim().length<20) throw new Error('No usable text was found. For a scanned PDF, paste the text manually.');
  return text;
}
