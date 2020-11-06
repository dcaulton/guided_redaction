import React from 'react';

export function buildRunButton(tier_1_scanners, scanner_type, buildTier1RunOptions, submitInsightsJob) {
  const tier_1_template_run_options = buildTier1RunOptions('template', scanner_type + '_t1_template')
  const tier_1_selected_area_run_options = buildTier1RunOptions('selected_area', scanner_type + '_t1_selected_area')
  const tier_1_ocr_run_options = buildTier1RunOptions('ocr', scanner_type + '_t1_ocr')
  const tier_1_telemetry_run_options = buildTier1RunOptions('telemetry', scanner_type + '_t1_telemetry')
  const tier_1_osa_run_options = buildTier1RunOptions('ocr_scene_analysis', scanner_type + '_t1_osa')

  const dropdown_id = 'scan_' + scanner_type + '_DropdownButton'
  return (
    <div className='d-inline'>
      <button
          className='btn btn-primary ml-2 dropdown-toggle'
          type='button'
          id={dropdown_id}
          data-toggle='dropdown'
          area-haspopup='true'
          area-expanded='false'
      >
        Run
      </button>
      <div className='dropdown-menu' aria-labelledby={dropdown_id}>
        <button className='dropdown-item'
            onClick={() => submitInsightsJob(scanner_type + '_current_frame')}
        >
          Frame
        </button>
        <button className='dropdown-item'
            onClick={() => submitInsightsJob(scanner_type + '_current_movie')}
        >
          Movie
        </button>
        <button className='dropdown-item'
            onClick={() => submitInsightsJob(scanner_type + '_all_movies')}
        >
          All Movies
        </button>
        {tier_1_template_run_options}
        {tier_1_selected_area_run_options}
        {tier_1_ocr_run_options}
        {tier_1_osa_run_options}
        {tier_1_telemetry_run_options}
      </div>
    </div>
  )
}

export function buildSkipCountDropdown(
  name, 
  value, 
  onchange
) {
  const scale_values = [
    {'0': '0'},
    {'1': '1'},
    {'2': '2'},
    {'3': '3'},
    {'4': '4'},
    {'5': '5'},
    {'6': '6'},
    {'7': '7'},
    {'8': '8'},
    {'9': '9'},
  ]
  return buildLabelAndDropdown(
    scale_values,
    'Skip this many Frames out of 10',
    value,
    name,
    onchange
  )
}

export function buildT1ScannerScaleDropdown(
  name, 
  value, 
  onchange
) {
  const scale_values = [
    {'1:1': 'actual image scale only'},
    {'+/-10/1': '+/- 10%, 1% increments'},
    {'+/-10/5': '+/- 10%, 5% increments'},
    {'+/-20/1': '+/- 20%, 1% increments'},
    {'+/-20/5': '+/- 20%, 5% increments'},
    {'+/-20/10': '+/- 20%, 10% increments'},
    {'+/-25/1': '+/- 25%, 1% increments'},
    {'+/-25/5': '+/- 25%, 5% increments'},
    {'+/-40/1': '+/- 40%, 1% increments'},
    {'+/-40/5': '+/- 40%, 5% increments'},
    {'+/-50/1': '+/- 50%, 1% increments'},
    {'+/-50/5': '+/- 50%, 5% increments'},
    {'+/-50/10': '+/- 50%, 10% increments'}
  ]
  return buildLabelAndDropdown(
    scale_values,
    'Scale',
    value,
    name,
    onchange
  )
}

export function buildLabelAndDropdown(allowed_values, label, value, element_name, onchange, raw_options='') {
  return (
    <div>
      <div className='d-inline'>
        {label}
      </div>
      <div className='d-inline ml-2'>
        <select
            name={element_name}
            value={value}
            onChange={(event) => onchange(event.target.value)}
        >
          {allowed_values.map((hash, index) => {
            const key = Object.keys(hash)[0]
            const display_text = hash[key]
            return (
              <option value={key} key={index}>{display_text}</option>
            )
          })}
          {raw_options}
        </select>
      </div>
    </div>
  )
}

export function buildLabelAndTextInput(value, label, element_id, title, size, onchange) {
  return (
    <div>
      <div className='d-inline'>
        {label}
      </div>
      <div
          className='d-inline ml-2'
      >
        <input
            id={element_id}
            title={title}
            size={size}
            value={value}
            onChange={(event) => onchange(event.target.value)}
        />
      </div>
    </div>
  )
}

export function buildAttributesAddRow(name_element_id, value_element_id, onclick) {
  return (
    <div>
      <div className='font-weight-bold'>
        Attributes
      </div>
      <div>
        <div className='d-inline ml-2'>
          Name:
        </div>
        <div className='d-inline ml-2'>
          <input
              id={name_element_id}
              size='25'
          />
        </div>
        <div className='d-inline ml-2'>
          Value:
        </div>
        <div className='d-inline ml-2'>
          <input
              id={value_element_id}
              size='25'
          />
        </div>
        <div className='d-inline ml-2'>
          <button
              className='btn btn-primary p-1'
              onClick={() => onclick()}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

export function buildAttributesAsRows(the_attributes, delete_attribute_function) {
  if (!the_attributes) {
    return ''
  }
  return (
    <div>
    {Object.keys(the_attributes).map((name, index) => {
      return (
        <div key={index} className='mt-2'>
          <div className='d-inline'>
            Name:
          </div>
          <div className='d-inline ml-2'>
            {name}
          </div>
          <div className='d-inline ml-4'>
            Value:
          </div>
          <div className='d-inline'>
            {the_attributes[name]}
          </div>
          <div className='d-inline ml-2'>
            <button
                className='btn btn-primary'
                key={index}
                onClick={() => delete_attribute_function(name)}
            >
              Delete
            </button>
          </div>
        </div>
      )
    })}
  </div>
  )
}

export function buildInlinePrimaryButton(label, onclick) {
  return (
    <div
        className='d-inline'
    >
      <button
          className='btn btn-primary ml-2'
          onClick={() => onclick()}
      >
        {label}
      </button>
    </div>
  )
}

export function makePlusMinusRow(label, body_id) {
  const datatarget = '#' + body_id
  return (
    <div className='row bg-dark text-white'>
      <div className='col-lg-2' />
      <div
        className='col-lg-9 mt-2'
      >
        {label}
      </div>
      <div className='col-lg-1'>
        <button
            className='btn btn-link text-white'
            aria-expanded='true'
            data-target={datatarget}
            aria-controls={body_id}
            data-toggle='collapse'
            type='button'
        >
          +/-
        </button>
      </div>
    </div> 
  )
}

export function makePlusMinusRowLight(label, body_id) {
  const datatarget = '#' + body_id
  return (
    <div 
        className='row mt-2 mb-2 border-top border-bottom'
    >
      <div className='col-lg-2'>
      </div>

      <div
        className='col-lg-9 mt-2 h5'
      >
        {label}
      </div>
      <div className='col-lg-1'>
        <button
            className='btn btn-link'
            aria-expanded='true'
            data-target={datatarget}
            aria-controls={body_id}
            data-toggle='collapse'
            type='button'
        >
          +/-
        </button>
      </div>
    </div> 
  )
}

export function makeHeaderRow(label, body_id, show_visibility_callback=(()=>{})) {
  const datatarget = '#' + body_id
  return (
    <div className='row'>
      <div
        className='col-lg-10 h3'
      >
        {label}
      </div>
      <div className='col-lg-1 float-right'>
        <button
            className='btn btn-link'
            aria-expanded='false'
            data-target={datatarget}
            aria-controls={body_id}
            data-toggle='collapse'
            type='button'
        >
          +/-
        </button>
      </div>
      <div className='col-lg-1'>
        <div>
          <input
            className='mr-2 mt-3'
            type='checkbox'
            onChange={() => {show_visibility_callback()}}
          />
        </div>
      </div>
    </div> 
  )
}

export function buildTier1LoadButton(scanner_type, hash_of_scanners, load_scanner_function) {
  const scanner_keys = Object.keys(hash_of_scanners)
  const dropdown_id = scanner_type + '_run_button_dropdown'
  const none_key = scanner_type  + '_load_none'
  return (
    <div key='x34' className='d-inline'>
      <button
          key='temp_names_button'
          className='btn btn-primary ml-2 dropdown-toggle'
          type='button'
          id={dropdown_id}
          data-toggle='dropdown'
          area-haspopup='true'
          area-expanded='false'
      >
        Load
      </button>
      <div className='dropdown-menu' aria-labelledby={dropdown_id}>
        {scanner_keys.map((value, index) => {
          return (
            <button
                className='dropdown-item'
                key={index}
                onClick={() => load_scanner_function(value)}
            >
              {hash_of_scanners[value]['name']}
            </button>
          )
        })}
        <button
            className='dropdown-item'
            key={none_key}
            onClick={() => load_scanner_function()}
        >
          new
        </button>
      </div>
    </div>
  )
}

export function buildTier1DeleteButton(scanner_type, hash_of_scanners, delete_scanner_function) {
  const scanner_keys = Object.keys(hash_of_scanners)
  const button_id = 'delete_' + scanner_type + '_button'
  return (
    <div className='d-inline'>
      <button
          className='btn btn-primary ml-2 dropdown-toggle'
          type='button'
          id={button_id}
          data-toggle='dropdown'
          area-haspopup='true'
          area-expanded='false'
      >
        Delete
      </button>
      <div className='dropdown-menu' aria-labelledby={button_id}>
        {scanner_keys.map((value, index) => {
          return (
            <button
                className='dropdown-item'
                key={index}
                onClick={() => delete_scanner_function(value)}
            >
              {hash_of_scanners[value]['name']}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function buildIdString(id_value, scanner_type, unsaved_changes_flag) {
  const s1 = 'this ' + scanner_type + ' has not been saved and has no id yet'
  const s2 = scanner_type + ' id: ' + id_value.toString()
  if (!id_value) {
    return (
      <div className='d-inline font-weight-bold text-danger font-italic h5'>
        {s1}
      </div>
    )
  }
  let unsaved_changes_string = ''
  if (unsaved_changes_flag) {
    unsaved_changes_string = (
      <div className='font-weight-bold text-danger ml-2 h5'>
       there are unsaved changes - don't forget to press save
      </div>
    )
  }
  return (
    <div>
      <div className='d-inline ml-2'>
        {s2}
      </div>
      <div className='d-inline ml-2 font-italic'>
        {unsaved_changes_string}
      </div>
    </div>
  )
}

export function clearTier1Matches(scanner_type, 
      tier_1_matches, 
      scanner_id, 
      movie_url, 
      global_setter_function, 
      display_message_function, 
      scope
  ) {
  let deepCopyTier1Matches = JSON.parse(JSON.stringify(tier_1_matches))
  if (scope === 'all_scanners_of_this_type') {
    deepCopyTier1Matches[scanner_type] = {}
    global_setter_function('tier_1_matches', deepCopyTier1Matches)
    display_message_function('All ' + scanner_type + ' matches have been cleared')
  } else if (scope === 'all_movies') {
    delete deepCopyTier1Matches[scanner_type][scanner_id]
    global_setter_function('tier_1_matches', deepCopyTier1Matches)
    display_message_function('matches for this ' + scanner_type + ' + all movies have been cleared')
  } else if (scope === 'movie') {
    if (Object.keys(deepCopyTier1Matches[scanner_type][scanner_id]['movies']).includes(movie_url)) {
      delete deepCopyTier1Matches[scanner_type][scanner_id]['movies'][movie_url]
      global_setter_function('tier_1_matches', deepCopyTier1Matches)
      display_message_function('matches for this ' + scanner_type + ' + this movie have been cleared')
    }
  }
} 

export function buildClearMatchesButton(scanner_type, clear_matches_function) {
  const button_id = 'delete_' + scanner_type + '_matches_dropdown'
  const scanner_plural_label = 'all ' + scanner_type + 's'
  return (
    <div className='d-inline'>
      <button
          className='btn btn-primary ml-2 dropdown-toggle'
          type='button'
          id={button_id}
          data-toggle='dropdown'
          area-haspopup='true'
          area-expanded='false'
      >
        Clear Matches
      </button>
      <div className='dropdown-menu' aria-labelledby={button_id}>
        <button className='dropdown-item'
            onClick={() => clear_matches_function('movie')}
        >
          movie
        </button>
        <button className='dropdown-item'
            onClick={() => clear_matches_function('all_movies')}
        >
          all movies
        </button>
        <button className='dropdown-item'
            onClick={() => clear_matches_function('all_scanners_of_this_type')}
        >
          {scanner_plural_label}
        </button>
      </div>
    </div>
  )
}

export function doTier1Save(
    scanner_type, 
    getScannerFromStateFunction, 
    displayMessageFunction, 
    globalScannersDict, 
    globalScannerIdsDict,
    globalSetStateVar,
    when_done=(()=>{})
) {
  const scanner = getScannerFromStateFunction()
  const scanner_id = scanner['id']
  let deepCopyScanners = JSON.parse(JSON.stringify(globalScannersDict))
  let deepCopyThisScannerType = deepCopyScanners[scanner_type]
  deepCopyThisScannerType[scanner_id] = scanner
  deepCopyScanners[scanner_type] = deepCopyThisScannerType
  globalSetStateVar('tier_1_scanners', deepCopyScanners)
  let deepCopyScannerIds = JSON.parse(JSON.stringify(globalScannerIdsDict))
  deepCopyScannerIds[scanner_type] = scanner['id']
  globalSetStateVar('tier_1_scanner_current_ids', deepCopyScannerIds)
  displayMessageFunction(scanner_type + ' has been saved')
  when_done(scanner)
  return scanner
}
