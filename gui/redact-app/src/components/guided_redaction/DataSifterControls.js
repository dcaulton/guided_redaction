import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {
  buildAttributesAddRow, buildLabelAndTextInput, buildLabelAndDropdown,
  buildMatchIdField,
  buildInlinePrimaryButton, 
  buildTier1LoadButton, 
  buildTier1DeleteButton,
  makeHeaderRow,
  buildAttributesAsRows,
  buildIdString,
  clearTier1Matches,
  buildClearMatchesButton,
  buildRunButton,
  doTier1Save,
} from './SharedControls'


class DataSifterControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      fake_data: false,
      build_by_hand: false,
      debug: false,
      rows: [],
      left_cols: [],
      right_cols: [],
      movie_url: '',
      image_url: '',
      items: {},
      scale: '1:1',
      show_type: 'all',
      ocr_job_id: '',
      template_job_id: '',
      attributes: {},
      scan_level: 'tier_1',
      attribute_search_name: '',
      attribute_search_value: '',
      first_click_coords: [],
    }
    this.getDataSifterFromState=this.getDataSifterFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.getShowType=this.getShowType.bind(this)
    this.getAppZones=this.getAppZones.bind(this)
    this.deleteOcrAreaCallback=this.deleteOcrAreaCallback.bind(this)
  }

  getAppZones() {
    if (!this.state.id) {
      return {}
    }
    let build_obj = {}
    for (let i=0; i < this.state.rows.length; i++) {
      const rowcol = this.state.rows[i]
      for (let j=0; j < rowcol.length; j++) {
        const item_id = rowcol[j]
        const item = this.state.items[item_id]
        const build_item = {
          location: item['location'],
          size: item['size'],
          type: item['type'],
        }
        build_obj[item_id] = build_item
      }
    }
    return build_obj
  }

  submitForCompile() {
  //takes the ocr fields you have selected, packages them and submits as a DS compile manual job
  // what comes back is a data sifter to tweak
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.props.insights_image)
    const match_list = this.getCurrentOcrMatches() 
    const build_obj = {'movies': {}}
    build_obj['movies'][this.props.movie_url] = {'framesets': {}}
    build_obj['movies'][this.props.movie_url]['framesets'][frameset_hash] = match_list
    build_obj['movies']['source'] = {}
    build_obj['movies']['source'][this.props.movie_url] = {'framesets': {}}
    build_obj['movies']['source'][this.props.movie_url]['framesets'][frameset_hash] = {'images': [this.props.insights_image]}
    build_obj['movies']['source'][this.props.movie_url]['frames'] = [this.props.insights_image]

    this.props.submitInsightsJob('manual_compile_data_sifter', build_obj)
  }

  buildSubmitCompileButton() {
    if (!this.state.id) {
      return ''
    }
    return (
      <div
          className='d-inline ml-1'
      >
        <button
            className='btn btn-primary'
            onClick={() => this.submitForCompile() }
        >
          Submit for Compile
        </button>
      </div>
    )
  }

  getCurrentOcrMatches() {
    const cur_ocr_id = this.props.current_ids['t1_scanner']['ocr']
    if (!cur_ocr_id) {
      return {}
    }
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.props.insights_image)
    const cur_ocr_matches = this.props.tier_1_matches['ocr'][cur_ocr_id]
    if (!Object.keys(cur_ocr_matches['movies']).includes(this.props.movie_url)) {
      return {}
    }
    if (!Object.keys(cur_ocr_matches['movies'][this.props.movie_url]['framesets']).includes(frameset_hash)) {
      return {}
    }
    const match_list = cur_ocr_matches['movies'][this.props.movie_url]['framesets'][frameset_hash]
    return match_list
  }

  deleteOcrAreaCallback(end_coords) {
    const cur_ocr_id = this.props.current_ids['t1_scanner']['ocr']
    const match_list = this.getCurrentOcrMatches() 
    if (!match_list) {
      return
    }
    const frameset_hash = this.props.getFramesetHashForImageUrl(this.props.insights_image)
    let something_changed = false
    let build_matches = {}
    for (let i=0; i < Object.keys(match_list).length; i++) {
      const the_key = Object.keys(match_list)[i]
      const the_ele = match_list[the_key]
      const ele_start = the_ele['location']
      const ele_end = [
        the_ele['location'][0] + the_ele['size'][0],
        the_ele['location'][1] + the_ele['size'][1]
      ]
      if (
        this.props.clicked_coords[0] <= ele_start[0] &&
        ele_start[0] <= end_coords[0] &&
        this.props.clicked_coords[1] <= ele_start[1] &&
        ele_start[1] <= end_coords[1] 
      ) {
        something_changed = true
      } else if (
        this.props.clicked_coords[0] <= ele_end[0] &&
        ele_end[0] <= end_coords[0] &&
        this.props.clicked_coords[1] <= ele_end[1] &&
        ele_end[1] <= end_coords[1] 
      ) {
        something_changed = true
      } else {
        build_matches[the_key] = the_ele
      }
      
      if (something_changed) {
        let deepCopyT1Matches= JSON.parse(JSON.stringify(this.props.tier_1_matches))
        deepCopyT1Matches['ocr'][cur_ocr_id]['movies'][this.props.movie_url]['framesets'][frameset_hash] = build_matches
        this.props.setGlobalStateVar('tier_1_matches', deepCopyT1Matches)
      }
    }
    this.props.handleSetMode('ds_delete_ocr_area_1')
  }

  startDeleteOcrAreas() {
    this.props.handleSetMode('ds_delete_ocr_area_1')
  }

  buildDeleteOcrAreasButton() {
    return (
      <div
          className='d-inline ml-2'
      >
        <button
            className='btn btn-primary'
            onClick={() => this.startDeleteOcrAreas() }
        >
          Delete Ocr Areas
        </button>
      </div>
    )
  }

  buildBuildByHandButtonsRow() {
    if (!this.state.build_by_hand) {
      return ''
    }
    const delete_ocr_areas_button = this.buildDeleteOcrAreasButton()
    const submit_for_compile_button = this.buildSubmitCompileButton()
    return (
      <div className='row mt-2'>
        {delete_ocr_areas_button}
        {submit_for_compile_button}
      </div>
    )
  }

  getShowType() {
    return this.state.show_type
  }

  buildShowType() {
    return buildLabelAndDropdown(
      [{'all': 'all'}, {'mask_items': 'mask_items'}, {'rows':'rows'}, {'left_cols':'left_cols'}, {'right_cols': 'right_cols'}, {'fast_pass_anchors': 'fast_pass_anchors'}],
      'Display Objects of This Type:',
      this.state.show_type,
      'show_type',
      ((value)=>{this.setLocalStateVar('show_type', value)})
    )
  }

  buildBuildByHandCheckbox(field_name, label) {
    let checked_val = ''
    if (this.state.build_by_hand) {
      checked_val = 'checked'
    }
    return (
      <div className='ml-2'>
        <div className='d-inline'>
          <input
            className='mr-2'
            checked={checked_val}
            type='checkbox'
            onChange={() => this.setLocalStateVar(field_name, !this.state[field_name])}
            MAMA
          />
        </div>
        <div className='d-inline'>
          {label}
        </div>
      </div>
    )
  }

  toggleBuildByHandValue() {
    let display_mess = false
    if (!this.state.build_by_hand) {
      display_mess = true
    }
    this.setState({'build_by_hand': !this.state.build_by_hand})
    if (display_mess) {
      this.props.setGlobalStateVar('message', 'First, specify your apps name and metadata.  Next, find a frame in the scrubber, ocr it, and use the Delete Ocr Areas button to remove ocr results that are not part of the app.  When you are done, press the Submit for Compile button.')
    }
  }

  buildToggleField(field_name, label) {
    let checked_val = ''
    if (this.state[field_name]) {
      checked_val = 'checked'
    }
    return (
      <div className='ml-2'>
        <div className='d-inline'>
          <input
            className='mr-2'
            checked={checked_val}
            type='checkbox'
            onChange={() => this.toggleBuildByHandValue()}
          />
        </div>
        <div className='d-inline'>
          {label}
        </div>
      </div>
    )
  }

  showSourceFrame(movie_url, image_frameset_index) {
    this.props.setCurrentVideo(movie_url)
    setTimeout((() => {this.props.setScrubberToIndex(image_frameset_index)}), 1000)
  }

  componentDidMount() {
    this.loadNewDataSifter()
    this.props.addInsightsCallback('getDataSifterShowType', this.getShowType)
    this.props.addInsightsCallback('getDataSifterAppZones', this.getAppZones)
    this.props.addInsightsCallback('ds_delete_ocr_area_2', this.deleteOcrAreaCallback)
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    function anon_func() {
      this.doSave()
      when_done()
    }
    this.setState(
      {
        [var_name]: var_value,
      },
      anon_func
    )
  }

  buildLoadButton() {                                                           
    return buildTier1LoadButton(
      'data_sifter',
      this.props.tier_1_scanners['data_sifter'],
      ((value)=>{this.loadDataSifter(value)})
    )
  }

  loadDataSifter(data_sifter_id) {
    if (!data_sifter_id) {
      this.loadNewDataSifter()
    } else {
      const sam = this.props.tier_1_scanners['data_sifter'][data_sifter_id]
      this.setState({
        id: sam['id'],
        name: sam['name'],
        fake_data: sam['fake_data'],
        debug: sam['debug'],
        rows: sam['rows'],
        left_cols: sam['left_cols'],
        right_cols: sam['right_cols'],
        items: sam['items'],
        image_url: sam['image_url'],
        movie_url: sam['movie_url'],
        scale: sam['scale'],
        ocr_job_id: sam['ocr_job_id'],
        template_job_id: sam['template_job_id'],
        attributes: sam['attributes'],
        scan_level: sam['scan_level'],
      })
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['data_sifter'] = data_sifter_id
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Data sifter has been loaded')
  }

  loadNewDataSifter() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['data_sifter'] = ''
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    const the_id = 'data_sifter_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      fake_data: false,
      debug: false,
      rows: [],
      left_cols: [],
      right_cols: [],
      items: {},
      image_url: '',
      movie_url: '',
      scale: '1:1',
      ocr_job_id: '',
      template_job_id: '',
      attributes: {},
      scan_level: 'tier_1',
    })
  }

  getDataSifterFromState() {
    const data_sifter = {                                                          
      id: this.state.id,
      name: this.state.name,
      fake_data: this.state.fake_data,
      debug: this.state.debug,
      rows: this.state.rows,
      left_cols: this.state.left_cols,
      right_cols: this.state.right_cols,
      items: this.state.items,
      image_url: this.state.image_url,
      movie_url: this.state.movie_url,
      scale: this.state.scale,
      ocr_job_id: this.state.ocr_job_id,
      template_job_id: this.state.template_job_id,
      attributes: this.state.attributes,
      scan_level: this.state.scan_level,
    }
    return data_sifter
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'data_sifter',
      this.getDataSifterFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.current_ids,
      this.props.setGlobalStateVar,
      when_done
    )
  }

  async doSaveToDatabase() {
    this.doSave(((data_sifter) => {
      this.props.saveScannerToDatabase(
        'data_sifter',
        data_sifter,
        (()=>{this.props.displayInsightsMessage('Selected Area has been saved to database')})
      )
    }))
  }

  buildMatchIdField2(job_type, is_required=true) {
    return buildMatchIdField(
        job_type,
        this.props.jobs,
        this.setLocalStateVar,
        this.state[job_type + '_job_id'],
        true
    )
  }

  buildScaleDropdown() {
    const values = [
      {'1:1': 'actual image scale only'},
      {'match_trigger': 'match trigger'}
    ]
    return buildLabelAndDropdown(
      values,
      'Scale',
      this.state.scale,
      'data_sifter_scale',
      ((value)=>{this.setLocalStateVar('scale', value)})
    )
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'data_sifter_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildScanLevelDropdown2() {
    const scan_level_dropdown = [
      {'tier_1': 'Tier 1 (select only)'},
      {'tier_3': 'Tier 3 (select and extract)'}
    ]

    return buildLabelAndDropdown(
      scan_level_dropdown,
      'Scan Level',
      this.state.scan_level,
      'data_sifter_scan_level',
      ((value)=>{this.setLocalStateVar('scan_level', value)})
    )
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setState(
      {
        attributes: deepCopyAttributes,
      },
      this.doSave
    )
    this.props.displayInsightsMessage('Attribute was added')
  }

  doAddAttribute() {
    const value_ele = document.getElementById('data_sifter_attribute_value')
    const name_ele = document.getElementById('data_sifter_attribute_name')
    if (value_ele.value && name_ele.value) {
      this.setAttribute(name_ele.value, value_ele.value)
      name_ele.value = ''
      value_ele.value = ''
    }
  }

  deleteAttribute(name) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    if (!Object.keys(this.state.attributes).includes(name)) {
      return
    }
    delete deepCopyAttributes[name]
      this.setState(
      {
        attributes: deepCopyAttributes,
      },
      this.doSave
    )
    this.props.displayInsightsMessage('Attribute was deleted')
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      'data_sifter_attribute_name',
      'data_sifter_attribute_value',
      (()=>{this.doAddAttribute()})
    )
    const attribs_list = buildAttributesAsRows(
      this.state.attributes,
      ((value)=>{this.deleteAttribute(value)})
    )
    return (
      <div>
        {add_attr_row}
        {attribs_list}
      </div>
    )
  }

  buildSaveToDatabaseButton() {
    return buildInlinePrimaryButton(
      'Save to DB',
      (()=>{this.doSaveToDatabase()})
    )
  }

  buildBuildButton() {
    const t1_sa_build_options = this.props.buildTier1RunOptions(
      'selected_area', 
      'data_sifter_build_t1_selected_area'
    )
    if (!t1_sa_build_options) {
      return
    }
    const data_sifter_id = this.props.current_ids['t1_scanner']['data_sifter']
    if (!Object.keys(this.props.tier_1_scanners['data_sifter']).includes(data_sifter_id)) {
      return
    }
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='scanDataSifterBuildDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Build
        </button>
        <div className='dropdown-menu' aria-labelledby='scanDataSifterBuildDropdownButton'>
          {t1_sa_build_options}
        </div>
      </div>
    )
  }

  buildRunButtonWrapper() {
    if (!Object.keys(this.props.tier_1_scanners['data_sifter']).includes(this.state.id)) {
      return
    }
    if (!this.state.ocr_job_id) {
      return
    }
    return buildRunButton(
      this.props.tier_1_scanners, 'data_sifter', this.props.buildTier1RunOptions, this.props.submitInsightsJob
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'data_sifter',
      this.props.tier_1_scanners['data_sifter'],
      ((value)=>{this.deleteDataSifter(value)})
    )
  }

  deleteDataSifter(sam_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyDataSifters = deepCopyScanners['data_sifter']
    delete deepCopyDataSifters[sam_id]
    deepCopyScanners['data_sifter'] = deepCopyDataSifters
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (sam_id === this.props.current_ids['t1_scanner']['data_sifter']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
      deepCopyIds['t1_scanner']['data_sifter'] = ''
      this.props.setGlobalStateVar('current_ids', deepCopyIds)
    }
    this.props.displayInsightsMessage('Data Sifter was deleted')
  }

  clearMatches(scope) {
    return clearTier1Matches(
      'data_sifter',
      this.props.tier_1_matches,
      this.props.current_ids['t1_scanner']['data_sifter'],
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  buildClearMatchesButton2() {
    const match_keys = Object.keys(this.props.tier_1_matches['data_sifter'])
    if (match_keys.length === 0) {
      return
    }
    return buildClearMatchesButton(
      'data_sifter',
      ((a)=>{this.clearMatches(a)})
    )
  }

  buildNormalScanModeButtonsRow() {
    if (this.state.build_by_hand) {
      return ''
    }
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const build_button = this.buildBuildButton()
    const run_button = this.buildRunButtonWrapper()
    return (
      <div className='row mt-2'>
        {load_button}
        {delete_button}
        {save_to_db_button}
        {clear_matches_button}
        {build_button}
        {run_button}
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['data_sifter']) {
      return([])
    }
    const id_string = buildIdString(this.state.id, 'data_sifter', false)
    const name_field = this.buildNameField()
    const scale_dropdown = this.buildScaleDropdown()
    const ocr_job_id_dropdown = this.buildMatchIdField2('ocr', true) 
    const template_job_id_dropdown = this.buildMatchIdField2('template', true) 
    const fake_data_checkbox = this.buildToggleField('fake_data', 'Generate Fake Data')
    const build_by_hand_checkbox = this.buildToggleField('build_by_hand', 'Tune this Data Sifter by Hand')
    const debug_checkbox = this.buildToggleField('debug', 'Debug')
    const show_type_dropdown = this.buildShowType()
    const attributes_list = this.buildAttributesList()
    const scan_level_dropdown = this.buildScanLevelDropdown2()
    const normal_scan_mode_buttons_row = this.buildNormalScanModeButtonsRow()
    const build_by_hand_buttons_row = this.buildBuildByHandButtonsRow()
    const header_row = makeHeaderRow(
      'data sifter',
      'data_sifter_body',
      (() => this.props.toggleShowVisibility('data_sifter'))
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='data_sifter_body' 
                className='row collapse bg-light'
            >
              <div id='data_sifter_main' className='col'>

                {normal_scan_mode_buttons_row}

                {build_by_hand_buttons_row}

                <div className='row mt-2'>
                  {build_by_hand_checkbox}
                </div>

                <div className='row mt-2'>
                  {id_string}
                </div>

                <div className='row mt-2'>
                  {name_field}
                </div>

                <div className='row mt-2'>
                  {scale_dropdown}
                </div>

                <div className='row mt-2'>
                  {ocr_job_id_dropdown}
                </div>

                <div className='row mt-2'>
                  {template_job_id_dropdown}
                </div>

                <div className='row mt-2'>
                  {fake_data_checkbox}
                </div>

                <div className='row mt-2'>
                  {debug_checkbox}
                </div>

                <div className='row mt-2'>
                  {show_type_dropdown}
                </div>

                <div className='row mt-2'>
                  {scan_level_dropdown}
                </div>

                <div className='row mt-1 mr-1 ml-1 border-top'>
                  {attributes_list}
                </div>

                <div className='row mt-3 ml-1 mr-1'>
                  <ScannerSearchControls
                    search_attribute_name_id='data_sifter_database_search_attribute_name'
                    search_attribute_value_id='data_sifter_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='data_sifter'
                  />
                </div>

              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default DataSifterControls;
