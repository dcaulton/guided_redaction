import React from 'react';                                                      

export const buildIllustrateColorSelect = function(name, value, onchange) {
  return (
    <select
        name={name}
        value={value}
        onChange={onchange}
    >
      <option value='#000000'>Black</option>
      <option value='#CCCC00'>Gold</option>
      <option value='#DD0000'>Red</option>
      <option value='#00DD00'>Green</option>
      <option value='#FFFFFF'>White</option>
    </select>
  )
}

export const buildIllustrateLineWidthSelect = function(name, value, onchange) {
  return (
    <select
        name={name}
        value={value}
        onChange={onchange}
    >
      <option value='1'>1px</option>
      <option value='2'>2px</option>
      <option value='3'>3px</option>
      <option value='5'>5px</option>
      <option value='10'>10px</option>
      <option value='20'>20px</option>
    </select>
  )
}

export const buildIllustrateDarkenPercentSelect = function (name, value, onchange) {
  return (
    <select
        name={name}
        value={value}
        onChange={onchange}
    >
      <option value='.1'>10%</option>
      <option value='.2'>20%</option>
      <option value='.3'>30%</option>
      <option value='.5'>50%</option>
      <option value='.75'>75%</option>
      <option value='1'>100%</option>
    </select>
  )
}

export const buildRedactionRuleControls = function (
  redact_rule,
  setGlobalStateVar
  ) {

  function updateRedactField(field_name, the_value) {
    let deepCopyRedactRule = JSON.parse(JSON.stringify(redact_rule))
    deepCopyRedactRule[field_name] = the_value
    setGlobalStateVar('redact_rule', deepCopyRedactRule)
  }

  const mask_method = buildRedactionTypeSelect(
    'mask_method',
    redact_rule.mask_method,
    ((event) => updateRedactField('mask_method', event.target.value))
  )

  const replace_with = buildRedactionReplaceWithSelect(
    'replace_with',
    redact_rule,
    ((event) => updateRedactField('replace_with', event.target.value))
  )

  const erode_iterations = buildRedactionErodeIterationsSelect(
    'erode_iterations',
    redact_rule,
    ((event) => updateRedactField('erode_iterations', event.target.value))
  )

  const bucket_closeness = buildRedactionBucketClosenessSelect(
    'bucket_closeness',
    redact_rule,
    ((event) => updateRedactField('bucket_closeness', event.target.value))
  )

  const min_contour_area = buildRedactionMinContourAreaSelect(
    'min_contour_area',
    redact_rule,
    ((event) => updateRedactField('min_contour_area', event.target.value))
  )

  return (
    <div>
    {mask_method}
    {replace_with}
    {erode_iterations}
    {bucket_closeness}
    {min_contour_area}
    </div>
  )
}


export const buildRedactionBucketClosenessSelect = function (
    name,
    redaction_rule,
    onchange
  ) {
  if (redaction_rule.mask_method !== 'text_eraser') {
    return ''
  }
  if (redaction_rule.replace_with !== 'color_partitioned') {
    return ''
  }
  return (
    <div>
      <div className='d-inline'>
        Bucket Closeness
      </div>
      <div className='d-inline ml-2'>
        <select 
          name={name}
          value={redaction_rule.bucket_closeness}
          onChange={onchange}
        >
          <option value='25'>25</option>
          <option value='50'>50</option>
          <option value='75'>75</option>
          <option value='100'>100</option>
          <option value='150'>150</option>
          <option value='200'>200</option>
        </select>
      </div>
    </div>
  )
}

export const buildRedactionMinContourAreaSelect = function (
    name,
    redaction_rule,
    onchange
  ) {
  if (redaction_rule.mask_method !== 'text_eraser') {
    return ''
  }
  if (redaction_rule.replace_with !== 'color_partitioned') {
    return ''
  }
  return (
    <div>
      <div className='d-inline'>
        Min Contour Area
      </div>
      <div className='d-inline ml-2'>
        <select 
          name={name}
          value={redaction_rule.min_contour_area}
          onChange={onchange}
        >
          <option value='100'>100</option>
          <option value='200'>200</option>
          <option value='300'>300</option>
          <option value='400'>400</option>
          <option value='500'>500</option>
          <option value='600'>600</option>
          <option value='800'>800</option>
          <option value='1000'>1000</option>
          <option value='1200'>1200</option>
          <option value='1800'>1800</option>
          <option value='2400'>2400</option>
          <option value='3000'>3000</option>
        </select>
      </div>
    </div>
  )
}

export const buildRedactionErodeIterationsSelect = function (
    name,
    redaction_rule,
    onchange
  ) {
  if (redaction_rule.mask_method !== 'text_eraser') {
    return ''
  }
  if (redaction_rule.replace_with !== 'eroded') {
    return ''
  }
  return (
    <div>
      <div className='d-inline'>
        Erode Iterations
      </div>
      <div className='d-inline ml-2'>
        <select 
          name={name}
          value={redaction_rule.erode_iterations}
          onChange={onchange}
        >
          <option value='1'>1</option>
          <option value='3'>3</option>
          <option value='5'>5</option>
          <option value='7'>7</option>
          <option value='9'>9</option>
          <option value='11'>11</option>
          <option value='13'>13</option>
          <option value='15'>15</option>
          <option value='17'>17</option>
          <option value='19'>19</option>
        </select>
      </div>
    </div>
  )
}

export const buildRedactionReplaceWithSelect = function (
    name,
    redaction_rule,
    onchange
  ) {
  if (redaction_rule.mask_method !== 'text_eraser') {
    return ''
  }
  return (
    <div>
      <div className='d-inline'>
        Replace With
      </div>
      <div className='d-inline ml-2'>
        <select 
          name={name}
          value={redaction_rule.replace_with}
          onChange={onchange}
        >
          <option value='eroded'>Eroded</option>
          <option value='edge_partitioned'>Edge Partitioned</option>
          <option value='color_partitioned'>Color Partitioned</option>
        </select>
      </div>
    </div>
  )
}

export const buildRedactionTypeSelect = function (
    name,
    value,
    onchange,
  ) {
  return (
    <div>
      <div className='d-inline'>
        Redaction Type
      </div>
      <div className='d-inline ml-2'>
        <select 
          name={name}
          value={value}
          onChange={onchange}
        >
          <option value='blur_7x7'>Gaussian Blur 7x7</option>
          <option value='blur_21x21'>Gaussian Blur 21x21</option>
          <option value='blur_median'>Median Blur</option>
          <option value='black_rectangle'>Black Rectangle</option>
          <option value='green_outline'>Green Outline</option>
          <option value='background_color'>Background Color</option>
          <option value='text_eraser'>Text Eraser</option>
        </select>
      </div>
    </div>
  )
}

export const buildFramesetDiscriminatorSelect = function (
    name,
    value,
    onchange,
  ) {
  return (
   <select
      name={name}
      value={value}
      onChange={onchange}
   >
    <option value='gray64'>gray 64x64</option>
    <option value='gray32'>gray 32x32</option>
    <option value='gray16'>gray 16x16</option>
    <option value='gray8'>gray 8x8 (default)</option>
    <option value='gray6'>gray 6x6</option>
    <option value='gray4'>gray 4x4</option>
  </select>
  )
}

export const getMessage = function (mode, submode='') {
    let msg = ''
    if (mode === 'add_1' && submode === 'box') {
      msg = 'click on the first corner of the box'
    } else if (mode === 'add_2' && submode === 'box') {
      msg = 'click on the second corner of the box'
    } else if (mode === 'add_1' && submode === 'ocr') {
      msg = 'click on the first corner of the region to scan for text'
    } else if (mode === 'add_2' && submode === 'ocr') {
      msg = 'click on the second corner of the region to scan for text'
    } else if (mode === 'delete' && submode === 'item') {
      msg = 'click anywhere within a box to delete that item'
    } else if (mode === 'delete_1' && submode === 'box_all') {
      msg = 'click on the first corner of the box'
    } else if (mode === 'delete_2' && submode === 'box_all') {
      msg = 'click on the second corner of the box'
//    } else if (mode === 'illustrate' && submode === 'ill_oval_1') {
//      msg = 'click on the center of the oval'
//    } else if (mode === 'illustrate' && submode === 'ill_oval_2') {
//      msg = 'click on the right or left edge of the oval'
//    } else if (mode === 'illustrate' && submode === 'ill_oval_3') {
//      msg = 'click on the top or bottom edge of the oval'
//    } else if (mode === 'illustrate' && submode === 'ill_box_1') {
//      msg = 'click on the first corner of the box'
//    } else if (mode === 'illustrate' && submode === 'ill_box_2') {
//      msg = 'click on the second corner of the box'
    } else if (mode === 'redact') {
      msg = 'redacting selected areas'
    } else if (mode === 'reset') {
      msg = 'image has been reset'
    } else if (mode === 'add_template_anchor_1') {
      msg = 'Select the first corner of the Region of Interest'
    } else if (mode === 'add_template_anchor_2') {
      msg = 'Select the second corner of the Region of Interest'
    } else if (mode === 'add_template_mask_zone_1') {
      msg = 'Select the first corner of the Region of Interest'
    } else if (mode === 'add_template_mask_zone_2') {
      msg = 'Select the second corner of the Region of Interest'
    } else if (mode === 'clear') {
      msg = 'operation cancelled'
    } else if (mode === 'add_1_box') {
      msg = 'click on the first corner of the box'
    } else if (mode === 'add_2_box') {
      msg = 'click on the second corner of the box'
    } else if (mode === 'add_1_ocr') {
      msg = 'click on the first corner of the region to scan for text'
    } else if (mode === 'add_2_ocr') {
      msg = 'click on the second corner of the region to scan for text'
    } else if (mode === 'illustrate_box_1') {
      msg = 'click on the first corner of the box'
    } else if (mode === 'illustrate_box_shaded_1') {
      msg = 'click on the first corner of the box'
    } else if (mode === 'illustrate_oval_1') {
      msg = 'click on the center of the oval'
    } else if (mode === 'illustrate_oval_shaded_1') {
      msg = 'click on the center of the oval'
    } else if (mode === 'illustrate_oval_2') {
      msg = 'click on the right or left edge of the oval'
    } else if (mode === 'illustrate_oval_shaded_2') {
      msg = 'click on the right or left edge of the oval'
    } else if (mode === 'illustrate_oval_3') {
      msg = 'click on the top or bottom edge of the oval'
    } else if (mode === 'illustrate_oval_shaded_3') {
      msg = 'click on the top or bottom edge of the oval'
    } else if (mode === 'illustrate_box_2') {
      msg = 'click on the second corner of the box'
    } else if (mode === 'illustrate_box_shaded_2') {
      msg = 'click on the second corner of the box'
    } else {
      msg = '.'
    }
    return msg
}

export const getDisplayMode = function (mode, submode) {
  let disp_mode = 'View'
  if (mode === 'add_1' && submode === 'box') {
    disp_mode = 'Add Box'
  } else if (mode === 'add_2' && submode === 'box') {
    disp_mode = 'Add Box'
  } else if (mode === 'add_1' && submode === 'ocr') {
    disp_mode = 'Add OCR'
  } else if (mode === 'add_2' && submode === 'ocr') {
    disp_mode = 'Add OCR'
  } else if (mode === 'delete' && submode === 'item') {
    disp_mode = 'Delete Item'
  } else if (mode === 'delete_1' && submode === 'box_all') {
    disp_mode = 'Delete Items in Box'
  } else if (mode === 'delete_2' && submode === 'box_all') {
    disp_mode = 'Delete Items in Box'
  } else if (mode === 'redact') {
    disp_mode = 'Redact'
  } else if (mode === 'illustrate') {
    disp_mode = 'Illustrate'
  } else {
    disp_mode = '.'
  }
  return disp_mode
}

export const  getUrlVars = () => {
    var vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        value = decodeURIComponent(value)
        vars[key] = value
    })
    return vars
}
