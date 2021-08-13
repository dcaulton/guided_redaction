import React from 'react';

export function setLocalT1ScannerStateVar(
    var_name, var_value, var_value_in_state, save_function, set_state_function, when_done=(()=>{})
) {
  if (typeof var_name === 'string' || var_name instanceof String) {
    function anon_func() {
      save_function()
      when_done()
    }
    // we have been given one key and one value
    if (var_value_in_state === var_value) {
      when_done()
    } else {
      set_state_function(
        {
          [var_name]: var_value,
        },
        anon_func
      )
    }
  } else {
    // var_name is actually a dict, second argument could be a callback
    let the_callback = (()=>{})
    if (typeof(var_value) === 'function') {
      the_callback = var_value
    }
    function anon_func() {
      save_function()
      the_callback()
    }
    set_state_function(
      var_name,
      anon_func
    )
  }
}

export function buildRunButton(
    tier_1_scanners, 
    scanner_type, 
    buildTier1RunOptions, 
    submitInsightsJob, 
    useFrameMovieMovies=true
) {
  const tier_1_template_run_options = buildTier1RunOptions('template', scanner_type + '_t1_template')
  const tier_1_selected_area_run_options = buildTier1RunOptions('selected_area', scanner_type + '_t1_selected_area')
  const tier_1_selection_grower_run_options = buildTier1RunOptions('selection_grower', scanner_type + '_t1_selection_grower')
  const tier_1_ocr_run_options = buildTier1RunOptions('ocr', scanner_type + '_t1_ocr')
  const tier_1_ds_run_options = buildTier1RunOptions('data_sifter', scanner_type + '_t1_ds')
  const tier_1_ff_run_options = buildTier1RunOptions('focus_finder', scanner_type + '_t1_ff')
  const tier_1_t1f_run_options = buildTier1RunOptions('t1_filter', scanner_type + '_t1_t1f')

  const dropdown_id = 'scan_' + scanner_type + '_DropdownButton'
  let frame_movie_movies = (
    <div>
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
    </div>
  )
  if (!useFrameMovieMovies) {
    frame_movie_movies = ''
  }
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
        {frame_movie_movies}
        {tier_1_template_run_options}
        {tier_1_selected_area_run_options}
        {tier_1_selection_grower_run_options}
        {tier_1_ocr_run_options}
        {tier_1_ds_run_options}
        {tier_1_ff_run_options}
        {tier_1_t1f_run_options}
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
  const button_id = body_id + '_button'
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
            id={button_id}
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

export function buildIdString(id_value='', scanner_type='', unsaved_changes_flag=false) {
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
  let deepCopyIds = JSON.parse(JSON.stringify(globalScannerIdsDict))
  deepCopyIds['t1_scanner'][scanner_type] = scanner['id']
  globalSetStateVar('current_ids', deepCopyIds)
  // TODO remove the need for displayMessageFunction
//  displayMessageFunction(scanner_type + ' has been saved')
  when_done(scanner)
  return scanner
}

export function buildMatchIdField(
    job_type, 
    jobs, 
    setLocalStateVar, 
    cur_value,
    is_required=true
) {
  let matches = []
  matches.push({'': ''})
  for (let i=0; i < jobs.length; i++) {
    const job = jobs[i]
    if (job['operation'] !== job_type + '_threaded') {
      continue
    }
    const build_obj = {}
    const desc = job['description'] + ' ' + job['id'].slice(0,3) + '...'
    build_obj[job['id']] = desc
    matches.push(build_obj)
  }

  let required_text = ''
  if (is_required) {
    required_text = '* Required'
  }

  const label = job_type + ' job id'
  const drop = buildLabelAndDropdown(
    matches,
    '',
    cur_value,
    job_type +'_job_id',
    ((value)=>{setLocalStateVar(job_type + '_job_id', value)})
  )
  return (
    <div className='col'>
      <div className='row'>
        <div className='col'>
          <div className='d-inline'>
            {label}
          </div>
          <div className='d-inline ml-2'>
            {drop}
          </div>
          <div className='d-inline ml-2 text-danger'>
            {required_text}
          </div>
        </div>
      </div>
    </div>
  )
}


export function buildToggleField(field_name, label, cur_value, setLocalStateVarFunc) {
  let checked_val = ''
  if (cur_value) {
    checked_val = 'checked'
  }
  return (
    <div className='ml-2'>
      <div className='d-inline'>
        <input
          className='mr-2'
          checked={checked_val}
          type='checkbox'
          onChange={() => setLocalStateVarFunc(field_name, !cur_value)}
        />
      </div>
      <div className='d-inline'>
        {label}
      </div>
    </div>
  )
}

export function loadMeta(
    meta_id, scanner_type, default_meta_values, current_ids, setGlobalStateVar, displayInsightsMessage, setState, 
    state_var, tier_1_scanners, loadNewMeta
) {
  if (!meta_id) {
    loadNewMeta(scanner_type, default_meta_values, current_ids, setGlobalStateVar, setState)
  } else {
    const s = tier_1_scanners[scanner_type][meta_id]
    const new_state_obj = JSON.parse(JSON.stringify(default_meta_values))

    for (let i=0; i < Object.keys(s).length; i++) {
      const name = Object.keys(s)[i]
      if (Object.keys(state_var).includes(name)) {
        new_state_obj[name] = s[name]
      }
    }
    setState(new_state_obj)
  }
  let deepCopyIds = JSON.parse(JSON.stringify(current_ids))
  deepCopyIds['t1_scanner'][scanner_type] = meta_id
  setGlobalStateVar('current_ids', deepCopyIds)
  displayInsightsMessage(scanner_type + ' meta has been loaded')
}


export function loadNewMeta(scanner_type, default_meta_values, current_ids, setGlobalStateVar, setState) {
  let deepCopyIds = JSON.parse(JSON.stringify(current_ids))
  deepCopyIds['t1_scanner'][scanner_type] = ''
  setGlobalStateVar('current_ids', deepCopyIds)
  const the_id = scanner_type + '_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

  const new_values = JSON.parse(JSON.stringify(default_meta_values))
  new_values['id'] = the_id
  setState(new_values)
}

export function deleteMeta(the_id, tier_1_scanners, scanner_type, setGlobalStateVar, current_ids, displayInsightsMessage) {
  let deepCopyScanners = JSON.parse(JSON.stringify(tier_1_scanners))
  let deepCopyMMs = deepCopyScanners[scanner_type]
  delete deepCopyMMs[the_id]
  deepCopyScanners[scanner_type] = deepCopyMMs
  setGlobalStateVar('tier_1_scanners', deepCopyScanners)
  if (the_id === current_ids['t1_scanner'][scanner_type]) {
    let deepCopyIds = JSON.parse(JSON.stringify(current_ids))
    deepCopyIds['t1_scanner'][scanner_type] = ''
    setGlobalStateVar('current_ids', deepCopyIds)
  }
  displayInsightsMessage(scanner_type + ' was deleted')
}

export function buildPicListOfAnchors(anchors, anchor_functions={}) {
  let return_arr = []
  for (let i=0; i < anchors.length; i++) {
    const anchor = anchors[i]
    const anchor_id = anchor['id']
    let anchor_id_row_part = (
      <div className='d-inline'>
        <div className='d-inline'>
          id:
        </div>
        <div className='d-inline ml-2'>
          {anchor_id}
        </div>
      </div>
    )
    let delete_button = ''
    if (Object.keys(anchor_functions).includes('delete_function')) {
      delete_button = (
        <button
          className='btn btn-primary ml-2'
          onClick={() => anchor_functions['delete_function'](anchor_id)}
        >
          delete
        </button>
      )
    }
    let train_button = ''
    if (
      Object.keys(anchor_functions).includes('train_function') &&
      !Object.keys(anchor).includes('cropped_image_bytes') 
    ) {
      train_button = (
        <button
          className='btn btn-primary ml-2'
          onClick={() => anchor_functions['train_function'](anchor_id)}
        >
          train
        </button>
      )
    }
    let img_obj = ''
    if (Object.keys(anchor).includes('cropped_image_bytes')) {
      const the_src = "data:image/gif;base64," + anchor['cropped_image_bytes']
      img_obj = (
        <img
          max-height='100'
          max-width='100'
          key={'dapper' + i}
          alt={anchor_id}
          title={anchor_id}
          src={the_src}
        />
      )
    }
    let feature_type_row = ''
    if (Object.keys(anchor).includes('feature_type')) {
      feature_type_row = (
        <div className='row'>
          <div className='d-inline'>
            feature type:
          </div>
          <div className='d-inline ml-2'>
            {anchor['feature_type']}
          </div>
        </div>
      )
    }
    let num_keypoints_row = ''
    if (Object.keys(anchor).includes('keypoints')) {
      const keypoints_obj = JSON.parse(anchor['keypoints'])
      const num_keypoints = keypoints_obj.length
      feature_type_row = (
        <div className='row'>
          <div className='d-inline'>
            number of keypoints :
          </div>
          <div className='d-inline ml-2'>
            {num_keypoints}
          </div>
        </div>
      )
    }
   
   
    return_arr.push(
      <div
        key={'hey' + i}
        className='row p-2 border-bottom'
      >
        <div className='col'>
          <div className='row'>
            {anchor_id_row_part}
            <div className='d-inline ml-2'>
              {img_obj}
              {delete_button}
              {train_button}
            </div>
          </div>

          {feature_type_row}
          {num_keypoints_row}
        </div>
      </div>
    )
  }
  return return_arr
}


export function buildSourceMovieImageInfo2(
    state_id, 
    tier_1_scanners, 
    movies, 
    getFramesetHashForImageUrl, 
    getFramesetHashesInOrder, 
    showSourceFrame
) {
  if (state_id) {
    if (Object.keys(tier_1_scanners).includes(state_id)) {
      const template = tier_1_scanners[state_id]
      if (template['anchors'].length > 0) {
        const movie_url = template['anchors'][0]['movie']
        const image_url = template['anchors'][0]['image']
        let goto_link = ''
        if (Object.keys(movies).includes(movie_url)) {
          const the_movie = movies[movie_url]
          const the_frameset = getFramesetHashForImageUrl(image_url, the_movie['framesets'])
          const movie_framesets = getFramesetHashesInOrder(the_movie)
          const image_frameset_index = movie_framesets.indexOf(the_frameset)
          goto_link = (
            <div>
              <button
                className='bg-light border-0 text-primary'
                onClick={() => showSourceFrame(movie_url, image_frameset_index)}
              >
                goto anchor source frame
              </button>
            </div>
          )
        }
        const style = {
          'fontSize': 'small',
        }
        return (
          <div className='ml-2'>
            <div>
              Source Info
            </div>
            <div style={style}>
              <div className='d-inline ml-2'>
                Movie url:
              </div>
              <div className='d-inline ml-2'>
                {movie_url}
              </div>
            </div>
            <div style={style}>
              <div className='d-inline ml-2'>
                Image url:
              </div>
              <div className='d-inline ml-2'>
                {image_url}
              </div>
            </div>
            {goto_link}
          </div>
        )
      }
    }
  }
}
