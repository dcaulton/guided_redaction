import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'                     
import {
  makeHeaderRow,
  buildLabelAndDropdown,
  buildLabelAndTextInput,
  buildInlinePrimaryButton,
  doTier1Save,
  buildTier1LoadButton,
  buildIdString,
  buildTier1DeleteButton,
  buildClearMatchesButton,
  clearTier1Matches,
  buildAttributesAsRows,
  buildRunButton,
  buildAttributesAddRow,
  buildMatchIdField,
  buildSkipCountDropdown,
} from './SharedControls'

class OcrControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      match_text: [],
      match_percent: 70,
      skip_frames: 0,
      skip_east: false,
      data_sifter_job_id: '',
      scan_level: 'tier_1',
      start: [],
      end: [],
      attributes: {},
      attribute_search_value: '',
      first_click_coords: [],
    }
    this.addOcrZoneCallback=this.addOcrZoneCallback.bind(this)
    this.getOcrMetaFromState=this.getOcrMetaFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.getOcrWindow=this.getOcrWindow.bind(this)
  }

  buildMatchIdField2() {
    return buildMatchIdField(
        'data_sifter',
        this.props.jobs,
        this.setLocalStateVar,
        this.state.data_sifter_job_id,
        false
    )
  }

  getOcrWindow() {
    return {
      start: this.state.start,
      end: this.state.end,
    }
  }

  componentDidMount() {
    this.props.addInsightsCallback('scan_ocr_2', this.addOcrZoneCallback)
    this.props.addInsightsCallback('getOcrWindow', this.getOcrWindow)
    this.loadNewOcrRule()
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

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setLocalStateVar(
      'attributes', 
      deepCopyAttributes, 
      (()=>this.props.displayInsightsMessage('Attribute was added'))
    )
  }

  doAddAttribute() {
    const value_ele = document.getElementById('ocr_attribute_value')
    const name_ele = document.getElementById('ocr_attribute_name')
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
    this.setLocalStateVar(
      'attributes', 
      deepCopyAttributes, 
      (()=>this.props.displayInsightsMessage('Attribute was deleted'))
    )
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      'ocr_attribute_name',
      'ocr_attribute_value',
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

  addOcrZoneCallback(end) {
    const start= this.props.clicked_coords
    this.setState({
      start: start,
      end: end,
    })
    this.props.handleSetMode('')
    this.props.displayInsightsMessage('zone was successfully selected')
  }

  buildPickCornersButton() {
    return (
      <button
          key='000'
          className='btn btn-primary'
          onClick={() => this.startOcrRegionAdd() }
      >
        Pick Corners
      </button>
    )
  }

  startOcrRegionAdd() {
    this.props.handleSetMode('scan_ocr_1')
    this.props.displayInsightsMessage('Select the first corner of the area to scan')
  }

  loadOcrRule(ocr_rule_id) {
    if (!ocr_rule_id) {
      this.loadNewOcrRule()
    } else {
      const ocr_rule = this.props.tier_1_scanners['ocr'][ocr_rule_id]
      this.setState({
        id: ocr_rule['id'],
        name: ocr_rule['name'],
        match_text: ocr_rule['match_text'],
        match_percent: ocr_rule['match_percent'],
        skip_frames: ocr_rule['skip_frames'],
        skip_east: ocr_rule['skip_east'],
        data_sifter_job_id: ocr_rule['data_sifter_job_id'],
        scan_level: ocr_rule['scan_level'],
        start: ocr_rule['start'],
        end: ocr_rule['end'],
        attributes: ocr_rule['attributes'],
      })
      ocr_rule_id = ocr_rule['id']
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['ocr'] = ocr_rule_id
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Ocr rule has been loaded')
  }

  loadNewOcrRule() {                                                   
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['ocr'] = ''
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    const the_id = 'ocr_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      match_text: [],
      match_percent: 70,
      skip_frames: 0,
      skip_east: false,
      data_sifter_job_id: '',
      scan_level: 'tier_1',
      start: [],
      end: [],
      attributes: {},
    })                                                                          
  } 

  getOcrMetaFromState() {
    const ocr_rule = {
      id: this.state.id,
      name: this.state.name,
      start: this.state.start,
      end: this.state.end,
      match_text: this.state.match_text,
      match_percent: this.state.match_percent,
      skip_frames: this.state.skip_frames,
      skip_east: this.state.skip_east,
      data_sifter_job_id: this.state.data_sifter_job_id,
      scan_level: this.state.scan_level,
      attributes: this.state.attributes,
    }
    return ocr_rule
  }

  buildRunButtonWrapper() {
    if (!Object.keys(this.props.tier_1_scanners['ocr']).includes(this.state.id)) {
      return ''
    }
    return buildRunButton(
      this.props.tier_1_scanners, 'ocr', this.props.buildTier1RunOptions, this.props.submitInsightsJob
    )
  }

  buildMatchText() {
    let the_value = ''
    if (this.state.match_text && this.state.match_text.length > 0) {
        the_value = this.state.match_text.join('\n')
    }
    return (
      <div className='ml-2 mt-2'>
        <div>
          Match On:
        </div>
        <div
            className='d-inline'
        >
          <textarea
             id='match_text'
             cols='60'
             rows='3'
             value={the_value}
            onChange={(event) => this.setLocalStateVar('match_text', event.target.value.split('\n'))}
          />
        </div>
      </div>
    )
  }

  buildMatchPercent() {
    return (
      <div
        className='d-inline ml-2 mt-2'
      >   
        <div className='d-inline'>
          Match Percent:
        </div>
        <div className='d-inline ml-2'>
          <input 
            id='match_percent'
            size='4'
            value={this.state.match_percent}
            onChange={(event) => this.setLocalStateVar('match_percent', event.target.value)}
          />
        </div>
      </div>
    )
  }

  buildSkipFrames() {
    return buildSkipCountDropdown(
      'skip_frames',
      this.state.skip_frames,
      ((value)=>{this.setLocalStateVar('skip_frames', value)})
    )
  }

  toggleSkipEast() {
    const new_value = (!this.state.skip_east)
    this.setLocalStateVar('skip_east', new_value)
  }

  buildSkipEast() {
    let checked_state = ''
    if (this.state.skip_east) {
      checked_state = 'checked'
    }
    return (
      <div className='ml-2'>
        <div className='d-inline'>
          Skip East
        </div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            id='toggle_skip_east'
            checked={checked_state}
            type='checkbox'
            onChange={() => this.toggleSkipEast()}
          />
        </div>
      </div>
    )
  }

  buildScanLevel() {
      const scan_level_dropdown = [
      {'tier_1': 'Tier 1 (find only)'},
      {'tier_2': 'Tier 2 (find and redact)'}
    ]

    return buildLabelAndDropdown(
      scan_level_dropdown,
      'Scan Level',
      this.state.scan_level,
      'ocr_scan_level',
      ((value)=>{this.setLocalStateVar('scan_level', value)})
    )
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'ocr_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildSaveToDatabaseButton() {
    return buildInlinePrimaryButton(
      'Save to DB',
      (()=>{this.doSaveToDatabase()})
    )
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'ocr',
      this.getOcrMetaFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.current_ids,
      this.props.setGlobalStateVar,
      when_done
    )
  }

  async doSaveToDatabase() {
    this.doSave(((ocr_rule) => {
      this.props.saveScannerToDatabase(
        'ocr',
        ocr_rule,
        (()=>{this.props.displayInsightsMessage('Ocr Rule has been saved to database')})
      )
    }))
  }

  buildLoadButton() {
    return buildTier1LoadButton(
      'ocr',
      this.props.tier_1_scanners['ocr'],
      ((value)=>{this.loadOcrRule(value)})
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'ocr',
      this.props.tier_1_scanners['ocr'],
      ((value)=>{this.deleteOcrRule(value)})
    )
  }

  deleteOcrRule(ocr_rule_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyOcrRules= deepCopyScanners['ocr']
    delete deepCopyOcrRules[ocr_rule_id]
    deepCopyScanners['ocr'] = deepCopyOcrRules
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (ocr_rule_id === this.props.current_ids['t1_scanner']['ocr']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
      deepCopyIds['t1_scanner']['ocr'] = ''
      this.props.setGlobalStateVar('current_ids', deepCopyIds)
    }
    this.props.displayInsightsMessage('Ocr rule was deleted')
  }

  buildClearMatchesButton2() {                                                  
    return buildClearMatchesButton(                                             
      'ocr',                                                          
      ((a)=>{this.clearOcrRuleMatches(a)})                                 
    )                                                                           
  }                                                                             
      
  clearOcrRuleMatches(scope) {
    return clearTier1Matches(
      'ocr',
      this.props.tier_1_matches,
      this.props.current_ids['t1_scanner']['ocr'],
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  render() {
    if (!this.props.visibilityFlags['ocr']) {
      return([])
    }
    const pick_button = this.buildPickCornersButton()
    const id_string = buildIdString(this.state.id, 'ocr_rule', false)
    const run_button = this.buildRunButtonWrapper()
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const save_to_database_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const match_text = this.buildMatchText()
    const data_sifter_job_id_field = this.buildMatchIdField2() 
    const match_percent = this.buildMatchPercent()
    const skip_frames = this.buildSkipFrames()
    const skip_east = this.buildSkipEast()
    const scan_level = this.buildScanLevel()
    const attributes_list = this.buildAttributesList()
    const header_row = makeHeaderRow(
      'ocr',
      'ocr_body',
      (() => this.props.toggleShowVisibility('ocr'))
    )
    const name_field = this.buildNameField()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='ocr_body' 
                className='row collapse pb-2'
            >
              <div id='ocr_main' className='col'>

                <div className='row bg-light'>
                  {load_button}
                  {delete_button}
                  {save_to_database_button}
                  {clear_matches_button}
                  {run_button}
                </div>

                <div className='row mt-2 ml-0 bg-light'>
                  {pick_button}
                </div>

                <div className='row bg-light'>
                  {id_string}
                </div>

                <div className='row bg-light'>
                  {name_field}
                </div>

                <div className='row bg-light'>
                  {match_text}
                </div>

                <div className='row bg-light'>
                  {data_sifter_job_id_field}
                </div>

                <div className='row bg-light'>
                  {match_percent}
                </div>

                <div className='row bg-light'>
                  {skip_frames}
                </div>

                <div className='row bg-light'>
                  {skip_east}
                </div>

                <div className='row bg-light'>
                  {scan_level}
                </div>

                <div className='row mt-1 mr-1 ml-1 border-top'>                 
                  {attributes_list}                                             
                </div>      

                <div className='row mt-3 ml-1 mr-1'>
                  <ScannerSearchControls
                    search_attribute_name_id='ocr_database_search_attribute_name'
                    search_attribute_value_id='ocr_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='ocr'
                  />
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default OcrControls;
