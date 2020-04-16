import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {
  makeHeaderRow,
  buildInlinePrimaryButton,
  doTier1Save,
  buildTier1LoadButton,
  buildTier1DeleteButton,
  buildLabelAndTextInput,
  buildIdString,
  buildAttributesAddRow,
  buildAttributesAsRows,
} from './SharedControls'

class OcrSceneAnalysisControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      skip_frames: 10,
      apps: [],
      attributes: {},
      unsaved_changes: false,
    }
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.getOcrSceneAnalysisRuleFromState=this.getOcrSceneAnalysisRuleFromState.bind(this)
    this.setLocalStateVarNoWarning=this.setLocalStateVarNoWarning.bind(this)
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

  getOcrSceneAnalysisRuleFromState() {
    const ocr_rule = {
      id: this.state.id,
      name: this.state.name,
      skip_frames: this.state.skip_frames,
      apps: this.state.apps,
      attributes: this.state.attributes,
    }
    return ocr_rule
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'ocr_scene_analysis',
      this.state.name,
      this.getOcrSceneAnalysisRuleFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.tier_1_scanner_current_ids,
      this.setLocalStateVarNoWarning,
      this.props.setGlobalStateVar,
      when_done,
    )
  }

  async doSaveToDatabase() {
    this.doSave(((ocr_scene_analysis_meta) => {
      this.props.saveScannerToDatabase(
        'ocr_scene_analysis',
        ocr_scene_analysis_meta,
        (()=>{this.props.displayInsightsMessage('Ocr scene analysis meta has been saved to database')})
      )
    }))
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'ocr_scene_analysis_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildSkipFramesField() {
    return buildLabelAndTextInput(
      this.state.skip_frames,
      'Skip frames',
      'ocr_scene_analysis_skip_frames',
      'skip_frames',
      5,
      ((value)=>{this.setLocalStateVar('skip_frames', value)})
    )
  }

  buildLoadButton() {
    return buildTier1LoadButton(
      'ocr_scene_analysis',
      this.props.tier_1_scanners['ocr_scene_analysis'],
      ((value)=>{this.loadOcrScreenAnalysisMeta(value)})
    )
  }

  loadOcrScreenAnalysisMeta(ocr_scene_analysis_meta_id) {
    if (!ocr_scene_analysis_meta_id) {
      this.loadNewOcrScreenAnalysisMeta()
    } else {
      const osa = this.props.tier_1_scanners['ocr_scene_analysis'][ocr_scene_analysis_meta_id]
      this.setState({
        id: osa['id'],
        name: osa['name'],
        skip_frames: osa['skip_frames'],
        apps: osa['apps'],
        attributes: osa['attributes'],
        attributes: osa['attributes'],
        unsaved_changes: false,
      })
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['ocr_scene_analysis'] = ocr_scene_analysis_meta_id
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Ocr screen analysis meta has been loaded')
  }

  loadNewOcrScreenAnalysisMeta() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['ocr_scene_analysis'] = ''
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    this.setState({
      id: '',
      name: '',
      skip_frames: 10,
      apps: [],
      attributes: {},
      attributes: {},
      unsaved_changes: false,
    })
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'ocr_scene_analysis',
      this.props.tier_1_scanners['ocr_scene_analysis'],
      ((value)=>{this.deleteOcrSceneAnalysisMeta(value)})
    )
  }

  deleteOcrSceneAnalysisMeta(osa_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyOcrSceneAnalysisMetas = deepCopyScanners['ocr_scene_analysis']
    delete deepCopyOcrSceneAnalysisMetas[osa_id]
    deepCopyScanners['ocr_scene_analysis'] = deepCopyOcrSceneAnalysisMetas
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (osa_id === this.props.tier_1_scanner_current_ids['ocr_scene_analysis']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
      deepCopyIds['ocr_scene_analysis'] = ''
      this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    }
    this.props.displayInsightsMessage('Ocr scene analysis meta was deleted')
  }

  buildCampaignMoviesBox() {
    const campaign_movies_string = this.props.campaign_movies.join('\n')
    return (
      <textarea
         cols='80'
         rows='10'
         value={campaign_movies_string}
         onChange={(event) => this.props.setCampaignMovies(event.target.value)}
      />
    )
  }

  buildRunButton() {
    if (!this.state.id) {                                                       
      return ''                                                                 
    }
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='scanSelectedAreaDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Run
        </button>
        <div className='dropdown-menu' aria-labelledby='scanSelectedAreaDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('ocr_scene_analysis_current_frame')}
          >
            Frame
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('ocr_scene_analysis_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('ocr_scene_analysis_all_movies')}
          >
            All Movies
          </button>
        </div>
      </div>
    )
  }

  updateApps(rows_as_string) {
    const apps = rows_as_string.split('\n')
    this.setState({
      apps: apps,
    })
  }

  buildAppsField() {
    return (
      <div className='ml-2 mt-2'>
        <div>
          Apps:
        </div>
        <div
            className='d-inline'
        >
          <textarea
             id='ocr_selected_area_apps'
             cols='50'
             rows='3'
             value={this.state.apps.join('\n')}
             onChange={(event) => this.updateApps(event.target.value)}
          />
        </div>
      </div>
    )
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
    const value_ele = document.getElementById('ocr_scene_analysis_attribute_value')
    const name_ele = document.getElementById('ocr_scene_analysis_attribute_name')
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
      'ocr_scene_analysis_attribute_name',
      'ocr_scene_analysis_attribute_value',
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

  render() {
    if (!this.props.visibilityFlags['ocr_scene_analysis']) {
      return([])
    }
    const header_row = makeHeaderRow(
      'ocr scene analysis',
      'ocr_scene_analysis_body',
      (() => this.props.toggleShowVisibility('ocr_scene_analysis'))
    )
    const id_string = buildIdString(this.state.id, 'ocr scene analysis', this.state.unsaved_changes)
    const save_button = this.buildSaveButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const name_field = this.buildNameField()
    const apps_field = this.buildAppsField()
    const skip_frames_field = this.buildSkipFramesField()
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const run_button = this.buildRunButton()
    const attributes_list = this.buildAttributesList()


    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='ocr_scene_analysis_body' 
                className='row collapse pb-2'
            >
              <div id='ocr_scene_analysis_main' className='col'>

                <div className='row bg-light'>
                  {load_button}
                  {delete_button}
                  {save_button}
                  {save_to_db_button}
                  {run_button}
                </div>

                <div className='row bg-light'>
                  {id_string}
                </div>

                <div className='row bg-light'>
                  {name_field}
                </div>

                <div className='row bg-light'>
                  {skip_frames_field}
                </div>

                <div className='row bg-light'>
                  {apps_field}
                </div>

                <div className='row bg-light border-top m-1 h5'>
                  app phrase info
                </div>

                <div className='row bg-light'>
                  {attributes_list}
                </div>

                <div className='row bg-light border-top'>
                  <ScannerSearchControls
                    search_attribute_name_id='ocr_scene_analysis_database_search_attribute_name'
                    search_attribute_value_id='ocr_scene_analysis_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='ocr_scene_analysis'
                  />
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default OcrSceneAnalysisControls;
