import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {
  buildAttributesAddRow, buildLabelAndTextInput, buildLabelAndDropdown,
  buildInlinePrimaryButton, 
  buildTier1LoadButton, 
  buildTier1DeleteButton,
  makeHeaderRow,
  buildAttributesAsRows,
  buildIdString,
  clearTier1Matches,
  buildClearMatchesButton,
  buildRunButton,
  setLocalT1ScannerStateVar,
  doTier1Save,
  buildToggleField,
  loadMeta,
  loadNewMeta,
  buildPicListOfAnchors,
  buildSourceMovieImageInfo2,
  deleteMeta,
} from './SharedControls'


class FeatureControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      attributes: {},
      scan_level: 'tier_1',
      masks_always: false,
      return_type: 'screen',
      match_type: 'brute_force',
      anchors: [],
      attribute_search_name: '',
      attribute_search_value: '',
    }
    this.getCurrentAnchors=this.getCurrentAnchors.bind(this)
    this.getMetaFromState=this.getMetaFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.doSave=this.doSave.bind(this)
    this.setState=this.setState.bind(this)
    this.loadNewMetaWrapper=this.loadNewMetaWrapper.bind(this)
    this.addAnchorCallback1=this.addAnchorCallback1.bind(this)
    this.addAnchorCallback2=this.addAnchorCallback2.bind(this)
    this.gotoSourceFrame=this.gotoSourceFrame.bind(this)
    this.deleteAnchor=this.deleteAnchor.bind(this)
    this.trainAnchor=this.trainAnchor.bind(this)
    this.scanner_type = 'feature'
    this.default_meta_values = {
      id: '',
      name: '',
      attributes: {},
      scan_level: 'tier_1',
      masks_always: false,
      return_type: 'orb',
      match_type: 'brute_force',
      anchors: [],
    }
  }

  deleteAnchor(anchor_id) {
    let build_anchors = []
    for (let i=0; i < this.state.anchors.length; i++) {
      if (this.state.anchors[i]['id'] !== anchor_id) {
        build_anchors.push(this.state.anchors[i])
      }
    }
    this.setLocalStateVar('anchors', build_anchors)
  }

  trainAnchor(anchor_id) {
    this.props.submitInsightsJob('train_feature_anchor', {'anchor_id': anchor_id})
  }

  clearAnchors() {
    this.setLocalStateVar('anchors', [])
    this.props.displayInsightsMessage('Anchors have been cleared')
  }

  buildAddAnchorButton() {
    return buildInlinePrimaryButton(
      'Add Anchor',
      (()=>{this.addFeatureAnchor()})
    )
  }

  buildClearAnchorsButton() {
    return buildInlinePrimaryButton(
      'Clear Anchors',
      (()=>{this.clearAnchors()})
    )
  }

  addFeatureAnchor() {
    this.props.handleSetMode('add_feature_anchor_1')
  }

  addAnchorCallback1() {
    this.props.handleSetMode('add_feature_anchor_2')
  }

  addAnchorCallback2(end_coords) {
    const start_coords = this.props.clicked_coords
    const anchor_id = 'anchor_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const the_anchor = {
        'id': anchor_id,
        'start': start_coords,
        'end': end_coords,
        'image': this.props.insights_image,
        'movie': this.props.movie_url,
        'feature_type': this.state.return_type,
        'match_type': this.state.match_type,
    }
    let deepCopyAnchors = JSON.parse(JSON.stringify(this.state.anchors))
    deepCopyAnchors.push(the_anchor)
    this.setLocalStateVar('anchors', deepCopyAnchors)
    this.props.handleSetMode('add_feature_anchor_1')
  }

  getCurrentAnchors() {
    return this.state.anchors
  }

  loadNewMetaWrapper() {
    loadNewMeta(
      this.scanner_type, this.default_meta_values, this.props.current_ids, this.props.setGlobalStateVar, this.setState
    )
  }

  componentDidMount() {
    this.loadNewMetaWrapper()
    this.props.addInsightsCallback('getCurrentFeatureAnchors', this.getCurrentAnchors)
    this.props.addInsightsCallback('add_feature_anchor_1', this.addAnchorCallback1)
    this.props.addInsightsCallback('add_feature_anchor_2', this.addAnchorCallback2)
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    let var_value_in_state = ''
    if (Object.keys(this.state).includes(var_name)) {
      var_value_in_state = this.state[var_name]
    }
    setLocalT1ScannerStateVar(var_name, var_value, var_value_in_state, this.doSave, this.setState, when_done)
  }

  buildLoadButton(scanner_type) {
    return buildTier1LoadButton(
      scanner_type,
      this.props.tier_1_scanners[scanner_type],
      ((value)=>{loadMeta(
        value, scanner_type, this.default_meta_values, this.props.current_ids, this.props.setGlobalStateVar, 
        this.props.displayInsightsMessage, this.setState, this.state, this.props.tier_1_scanners, 
        this.loadNewMetaWrapper
      )})
    )
  }

  getMetaFromState() {
    const build_obj = JSON.parse(JSON.stringify(this.default_meta_values))
    for (let i=0; i < Object.keys(build_obj).length; i++) {
      const name = Object.keys(build_obj)[i]
      if (Object.keys(this.state).includes(name)) {
        build_obj[name] = this.state[name]
      }
    }
    return build_obj
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      this.scanner_type,
      this.getMetaFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.current_ids,
      this.props.setGlobalStateVar,
      when_done
    )
  }

  async doSaveToDatabase() {
    this.doSave(((meta) => {
      this.props.saveScannerToDatabase(
        this.scanner_type,
        meta,
        (()=>{this.props.displayInsightsMessage(this.scanner_type + ' has been saved to database')})
      )
    }))
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      this.scanner_type + '_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setLocalStateVar('attributes', deepCopyAttributes)
    this.props.displayInsightsMessage('Attribute was added')
  }

  doAddAttribute() {
    const value_ele = document.getElementById(this.scanner_type + '_attribute_value')
    const name_ele = document.getElementById(this.scanner_type + '_attribute_name')
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
    this.setLocalStateVar('attributes', deepCopyAttributes)
    this.props.displayInsightsMessage('Attribute was deleted')
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      this.scanner_type + '_attribute_name',
      this.scanner_type + '_attribute_value',
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

  buildRunButtonWrapper() {
    if (!Object.keys(this.props.tier_1_scanners[this.scanner_type]).includes(this.state.id)) {
      return ''
    }
    return buildRunButton(
      this.props.tier_1_scanners, 
      this.scanner_type, 
      this.props.buildTier1RunOptions, 
      this.props.submitInsightsJob,
      true
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      this.scanner_type,
      this.props.tier_1_scanners[this.scanner_type],
      ((value)=>{
        deleteMeta(
          value, this.props.tier_1_scanners, this.scanner_type, this.props.setGlobalStateVar, 
          this.props.current_ids, this.props.displayInsightsMessage
        ) 
      })
    )
  }

  clearMatches(scope) {
    return clearTier1Matches(
      this.scanner_type,
      this.props.tier_1_matches,
      this.props.current_ids['current_ids'][this.scanner_type],
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  buildClearMatchesButton2() {
    return buildClearMatchesButton(
      this.scanner_type,
      ((a)=>{this.clearMatches(a)})
    )
  }

  buildReturnTypeDropdown() {
      const values = [
      {'all': 'All'},
      {'orb': 'ORB'},
    ]
    return buildLabelAndDropdown(
      values,
      'Return Type',
      this.state.return_type,
      'feature_return_type',
      ((value)=>{this.setLocalStateVar('return_type', value)})
    )
  }

  buildMatchTypeDropdown() {
      const values = [
      {'brute_force': 'Brute Force'},
      {'flann': 'FLANN'},
    ]
    return buildLabelAndDropdown(
      values,
      'Match Type',
      this.state.match_type,
      'feature_match_type',
      ((value)=>{this.setLocalStateVar('match_type', value)})
    )
  }

  buildAnchorsSection() {
    const anchors_pic_list = buildPicListOfAnchors(
      this.state.anchors, 
      {
        'delete_function': this.deleteAnchor,
        'train_function': this.trainAnchor,
      }
    )
    const source_movie_image_info = this.buildSourceMovieImageInfo()

    return (
      <div className='row mt-3 ml-1 mr-1 border-top'>
        <div className='col'>
          <div className='row font-weight-bold'>
            Anchors
          </div>

          <div className='row'>
            {source_movie_image_info}
          </div>

          {anchors_pic_list}
        </div>
      </div>
    )
  }

  buildSourceMovieImageInfo() {
    return buildSourceMovieImageInfo2(
      this.state.id,
      this.props.tier_1_scanners['feature'],
      this.props.movies,
      this.props.getFramesetHashForImageUrl,
      this.props.getFramesetHashesInOrder,
      this.gotoSourceFrame
    )
  }

  gotoSourceFrame(movie_url, image_frameset_index) {
    this.props.setCurrentVideo(movie_url)
    setTimeout((() => {this.props.setScrubberToIndex(image_frameset_index)}), 1000)
  }

  render() {
    if (!this.props.visibilityFlags[this.scanner_type]) {
      return([])
    }
    const load_button = this.buildLoadButton(this.scanner_type)
    const id_string = buildIdString(this.state.id, this.scanner_type, false)
    const name_field = this.buildNameField()
    const masks_field = buildToggleField('masks_always', 'Generate Masks Always', this.state.masks_always, this.setLocalStateVar)
    const return_type_dropdown = this.buildReturnTypeDropdown()
    const match_type_dropdown = this.buildMatchTypeDropdown()
    const attributes_list = this.buildAttributesList()
    const run_button = this.buildRunButtonWrapper()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const add_anchor_button = this.buildAddAnchorButton()
    const clear_anchors_button = this.buildClearAnchorsButton()
    const anchors_section = this.buildAnchorsSection()

    const header_row = makeHeaderRow(
      this.scanner_type,
      this.scanner_type + '_body',
      (() => this.props.toggleShowVisibility(this.scanner_type))
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='feature_body' 
                className='row collapse bg-light'
            >
              <div id='feature_main' className='col'>

                <div className='row'>
                  {load_button}
                  {delete_button}
                  {save_to_db_button}
                  {clear_matches_button}
                  {run_button}
                </div>

                <div className='row mt-2'>
                  {add_anchor_button}
                  {clear_anchors_button}
                </div>

                <div className='row mt-2'>
                  {id_string}
                </div>

                <div className='row mt-2'>
                  {name_field}
                </div>

                <div className='row mt-2'>
                  {masks_field}
                </div>

                <div className='row mt-2'>
                  {return_type_dropdown}
                </div>

                <div className='row mt-2'>
                  {match_type_dropdown}
                </div>

                {anchors_section}

                <div className='row mt-1 mr-1 ml-1 border-top'>
                  {attributes_list}
                </div>

                <div className='row mt-3 ml-1 mr-1'>
                  <ScannerSearchControls
                    search_attribute_name_id='feature_database_search_attribute_name'
                    search_attribute_value_id='feature_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='feature'
                  />
                </div>

              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default FeatureControls;
