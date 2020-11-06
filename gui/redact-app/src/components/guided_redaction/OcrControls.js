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
} from './SharedControls'

class OcrControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      match_text: [],
      match_percent: 90,
      skip_frames: 0,
      skip_east: false,
      scan_level: 'tier_1',
      start: [],
      end: [],
      image: '',
      movie: '',
      attributes: {},
      origin_entity_location: [],
      attribute_search_value: '',
      first_click_coords: [],
      unsaved_changes: false,
    }
    this.addOcrZoneCallback=this.addOcrZoneCallback.bind(this)
    this.getOcrMetaFromState=this.getOcrMetaFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.setLocalStateVarNoWarning=this.setLocalStateVarNoWarning.bind(this)
    this.getOcrWindow=this.getOcrWindow.bind(this)
    this.addOriginLocation=this.addOriginLocation.bind(this)
    this.getCurrentOcrOriginLocation=this.getCurrentOcrOriginLocation.bind(this)
  }

  showSourceFrame(movie_url, image_frameset_index) {
    this.props.setCurrentVideo(movie_url)
    setTimeout((() => {this.props.setScrubberToIndex(image_frameset_index)}), 1000)
  }

  buildGotoSourceLink() {
    if (this.state.movie && this.state.image) {
      if (Object.keys(this.props.movies).includes(this.state.movie)) {
        const the_movie = this.props.movies[this.state.movie]
        const the_frameset = this.props.getFramesetHashForImageUrl(
          this.state.image,
          the_movie['framesets']
        )
        const movie_framesets = this.props.getFramesetHashesInOrder(the_movie)
        const image_frameset_index = movie_framesets.indexOf(the_frameset)
        return (
          <div>
            <button
              className='bg-light border-0 text-primary'
              onClick={() => this.showSourceFrame(this.state.movie, image_frameset_index)}
            >
              goto source frame
            </button>
          </div>
        )
      }
    }
  }

  getCurrentOcrOriginLocation() {
    return this.state.origin_entity_location
  }

  addOriginLocation(origin_coords) {
    this.setState({
      origin_entity_location: origin_coords,
      image: this.props.insights_image,
      movie: this.props.movie_url,
    })
    this.props.displayInsightsMessage('ocr origin location was added,')
    this.props.handleSetMode('')
  }

  clearOriginLocation() {
    this.setState({
      origin_entity_location: [],
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Origin location has been cleared')
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
    this.props.addInsightsCallback('add_ocr_origin_location_1', this.addOriginLocation)
    this.props.addInsightsCallback('getCurrentOcrOriginLocation', this.getCurrentOcrOriginLocation)
    this.loadNewOcrRule()
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: true,
    },
    when_done())
  }

  setLocalStateVarNoWarning(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: false,
    },
    when_done())
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setState({
      attributes: deepCopyAttributes,
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Attribute was added')
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
    this.setState({
      attributes: deepCopyAttributes,
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Attribute was deleted')
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
      image: this.props.insights_image,
      movie: this.props.movie_url,
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
        scan_level: ocr_rule['scan_level'],
        start: ocr_rule['start'],
        end: ocr_rule['end'],
        attributes: ocr_rule['attributes'],
        image: ocr_rule['image'],
        movie: ocr_rule['movie'],
        origin_entity_location: ocr_rule['origin_entity_location'],
        unsaved_changes: false,
      })
      ocr_rule_id = ocr_rule['id']
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['ocr'] = ocr_rule_id
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Ocr rule has been loaded')
  }

  loadNewOcrRule() {                                                   
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['ocr'] = ''
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    const the_id = 'ocr_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      match_text: [],
      match_percent: 90,
      skip_frames: 0,
      skip_east: false,
      scan_level: 'tier_1',
      start: [],
      end: [],
      image: '',
      movie: '',
      attributes: {},
      origin_entity_location: [],
      unsaved_changes: false,
    })                                                                          
  } 

  getOcrMetaFromState() {
    const ocr_rule = {
      id: this.state.id,
      name: this.state.name,
      start: this.state.start,
      end: this.state.end,
      image: this.state.image,
      movie: this.state.movie,
      match_text: this.state.match_text,
      match_percent: this.state.match_percent,
      skip_frames: this.state.skip_frames,
      skip_east: this.state.skip_east,
      scan_level: this.state.scan_level,
      attributes: this.state.attributes,
      origin_entity_location: this.state.origin_entity_location,
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
             value={this.state.match_text.join('\n')}
            onChange={(event) => this.setLocalStateVar('match_text', event.target.value)}
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
    return (
      <div
        className='d-inline ml-2 mt-2'
      >   
        <div className='d-inline'>
          Skip Frames:
        </div>
        <div className='d-inline ml-2'>
          <input 
            id='skip_frames'
            size='4'
            value={this.state.skip_frames}
            onChange={(event) => this.setLocalStateVar('skip_frames', event.target.value)}
          />
        </div>
      </div>
    )
  }

  toggleSkipEast() {
    const new_value = (!this.state.skip_east)
    this.setState({
      skip_east: new_value,
    })
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

  buildSaveButton() {
    return buildInlinePrimaryButton(
      'Save',
      (()=>{this.doSave()})
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
      this.props.tier_1_scanner_current_ids,
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
    if (ocr_rule_id === this.props.tier_1_scanner_current_ids['ocr']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
      deepCopyIds['ocr'] = ''
      this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
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
      this.props.tier_1_scanner_current_ids['ocr'],
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  buildAddOriginLocationButton() {
    return buildInlinePrimaryButton(
      'Set Origin Location',
      (()=>{this.startAddOriginLocation()})
    )
  }

  buildClearOriginLocationButton() {
    return buildInlinePrimaryButton(
      'Clear Origin Location',
      (()=>{this.clearOriginLocation()})
    )
  }

  startAddOriginLocation() {
    this.setState({
      unsaved_changes: true,
    })
    this.props.handleSetMode('add_ocr_origin_location_1')
  }

  render() {
    if (!this.props.visibilityFlags['ocr']) {
      return([])
    }
    const pick_button = this.buildPickCornersButton()
    const id_string = buildIdString(this.state.id, 'ocr_rule', this.state.unsaved_changes)
    const run_button = this.buildRunButtonWrapper()
    const load_button = this.buildLoadButton()
    const save_button = this.buildSaveButton()
    const delete_button = this.buildDeleteButton()
    const save_to_database_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const match_text = this.buildMatchText()
    const match_percent = this.buildMatchPercent()
    const skip_frames = this.buildSkipFrames()
    const skip_east = this.buildSkipEast()
    const scan_level = this.buildScanLevel()
    const attributes_list = this.buildAttributesList()
    const add_origin_location_button = this.buildAddOriginLocationButton()
    const clear_origin_location_button = this.buildClearOriginLocationButton()
    const goto_source_link = this.buildGotoSourceLink()
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
                  {save_button}
                  {save_to_database_button}
                  {clear_matches_button}
                  {run_button}
                </div>

                <div className='row mt-2 ml-0 bg-light'>
                  {pick_button}
                  {add_origin_location_button}
                  {clear_origin_location_button}
                </div>

                <div className='row bg-light'>
                  {id_string}
                </div>

                <div className='row bg-light'>
                  {goto_source_link}
                </div>

                <div className='row bg-light'>
                  {name_field}
                </div>

                <div className='row bg-light'>
                  {match_text}
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
