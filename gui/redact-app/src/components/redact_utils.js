export const getMessage = function (mode, submode) {
    let msg = '';
    if (mode === 'add_1' && submode === 'box') {
      msg = 'click on the first corner of the box';
    } else if (mode === 'add_2' && submode === 'box') {
      msg = 'click on the second corner of the box';
    } else if (mode === 'add_1' && submode === 'ocr') {
      msg = 'click on the first corner of the region to scan for text';
    } else if (mode === 'add_2' && submode === 'ocr') {
      msg = 'click on the second corner of the region to scan for text';
    } else if (mode === 'delete' && submode === 'item') {
      msg = 'click anywhere within a box to delete that item';
    } else if (mode === 'delete_1' && submode === 'box_all') {
      msg = 'click on the first corner of the box';
    } else if (mode === 'delete_2' && submode === 'box_all') {
      msg = 'click on the second corner of the box';
    } else if (mode === 'redact') {
      msg = 'redacting selected areas';
    } else if (mode === 'reset') {
      msg = 'image has been reset';
    } else if (mode === 'clear') {
      msg = 'operation cancelled';
    } 
    return msg;
}

export const getDisplayMode = function (mode, submode) {
  let disp_mode = 'View';
  if (mode === 'add_1' && submode === 'box') {
    disp_mode = 'Add Box';
  } else if (mode === 'add_2' && submode === 'box') {
    disp_mode = 'Add Box';
  } else if (mode === 'add_1' && submode === 'ocr') {
    disp_mode = 'Add OCR';
  } else if (mode === 'add_2' && submode === 'ocr') {
    disp_mode = 'Add OCR';
  } else if (mode === 'delete' && submode === 'item') {
    disp_mode = 'Delete Item';
  } else if (mode === 'delete_1' && submode === 'box_all') {
    disp_mode = 'Delete Items in Box';
  } else if (mode === 'delete_2' && submode === 'box_all') {
    disp_mode = 'Delete Items in Box';
  } else if (mode === 'redact') {
    disp_mode = 'Redact';
  }
  return disp_mode;
}

export const  getUrlVars = () => {
    var vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        value = decodeURIComponent(value);
        vars[key] = value;
    });
    return vars;
}
