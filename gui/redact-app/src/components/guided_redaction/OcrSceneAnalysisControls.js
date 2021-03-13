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
  buildRunButton,
  buildAttributesAsRows,
  buildLabelAndDropdown,
  buildSkipCountDropdown,
} from './SharedControls'

class OcrSceneAnalysisControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      skip_frames: 0,
      scan_level: 'tier_1',
      debugging_output: false,
      apps: {},
      ocr_job_id: '',
      attributes: {},
      unsaved_changes: false,
    }
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.getOcrSceneAnalysisRuleFromState=this.getOcrSceneAnalysisRuleFromState.bind(this)
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
      scan_level: this.state.scan_level,
      debugging_output: this.state.debugging_output,
      apps: this.state.apps,
      ocr_job_id: this.state.ocr_job_id,
      attributes: this.state.attributes,
    }
    return ocr_rule
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'ocr_scene_analysis',
      this.getOcrSceneAnalysisRuleFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.current_ids,
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
    return buildSkipCountDropdown(
      'osa_skip_frames',
      this.state.skip_frames,
      ((value)=>{this.setLocalStateVar('skip_frames', value)})
    )
  }

  toggleDebuggingOutput() {
    const new_value = (!this.state.debugging_output)
    this.setState({
      debugging_output: new_value,
    })
  }

  buildDebuggingOutputField() {
    let debugging_output_checked = ''
    if (this.state.debugging_output) {
      debugging_output_checked = 'checked'
    }
    return (
      <div className='ml-1'>
        <input
          className='mr-2 mt-2'
          checked={debugging_output_checked}
          type='checkbox'
          onChange={() => this.toggleDebuggingOutput('debugging_output')}
        />
        produce debugging output
      </div>
    )
  }

  buildLoadButton() {
    return buildTier1LoadButton(
      'ocr_scene_analysis',
      this.props.tier_1_scanners['ocr_scene_analysis'],
      ((value)=>{this.loadOcrSceneAnalysisMeta(value)})
    )
  }

  loadOcrSceneAnalysisMeta(ocr_scene_analysis_meta_id) {
    if (!ocr_scene_analysis_meta_id) {
      this.loadNewOcrSceneAnalysisMeta()
    } else {
      const osa = this.props.tier_1_scanners['ocr_scene_analysis'][ocr_scene_analysis_meta_id]
      this.setState({
        id: osa['id'],
        name: osa['name'],
        skip_frames: osa['skip_frames'],
        scan_level: osa['scan_level'],
        debugging_output: osa['debugging_output'],
        apps: osa['apps'],
        ocr_job_id: osa['ocr_job_id'],
        attributes: osa['attributes'],
        unsaved_changes: false,
      })
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['ocr_scene_analysis'] = ocr_scene_analysis_meta_id
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Ocr screen analysis meta has been loaded')
  }

  loadNewOcrSceneAnalysisMeta() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['ocr_scene_analysis'] = ''
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    const the_id = 'ocr_scene_analysis_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      skip_frames: 0,
      scan_level: 'tier_1',
      debugging_output: false,
      apps: {},
      ocr_job_id: '',
      attributes: {},
      unsaved_changes: false,
    })
  }

  componentDidMount() {
    this.loadNewOcrSceneAnalysisMeta()
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
    if (osa_id === this.props.current_ids['t1_scanner']['ocr_scene_analysis']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
      deepCopyIds['t1_scanner']['ocr_scene_analysis'] = ''
      this.props.setGlobalStateVar('current_ids', deepCopyIds)
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

  buildRunButtonWrapper() {
    if (!Object.keys(this.props.tier_1_scanners['ocr_scene_analysis']).includes(this.state.id)) {
      return ''                                                                 
    }
    return buildRunButton(                                                      
      this.props.tier_1_scanners, 'ocr_scene_analysis', this.props.buildTier1RunOptions, this.props.submitInsightsJob
    )                                                                           
  }

  updateApps(apps_string) {
    const apps_obj = JSON.parse(apps_string)
    this.setState({
      apps: apps_obj,
    })
  }

  buildAppsField() {
    let pretty_apps_string = ''
    if (this.state.apps) {
      pretty_apps_string = JSON.stringify(this.state.apps, undefined, 2)
    }
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
             rows='6'
             value={pretty_apps_string}
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

  buildOcrMatchIdField() {
    let ocr_matches = []
    ocr_matches.push({'': ''})
    for (let i=0; i < this.props.jobs.length; i++) {
      const job = this.props.jobs[i]
      if (job['operation'] !== 'ocr_threaded') {
        continue
      }
      const build_obj = {}
      const desc = job['description'] + ' ' + job['id'].slice(0,3) + '...'
      build_obj[job['id']] = desc
      ocr_matches.push(build_obj)
    }

    return buildLabelAndDropdown(
      ocr_matches,
      'Ocr Job Id',
      this.state.ocr_job_id,
      'ocr_job_id',
      ((value)=>{this.setLocalStateVar('ocr_job_id', value)})
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
    const ocr_job_id_field = this.buildOcrMatchIdField()
    const apps_field = this.buildAppsField()
    const skip_frames_field = this.buildSkipFramesField()
    const debugging_output_field = this.buildDebuggingOutputField()
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const run_button = this.buildRunButtonWrapper()
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
                  {debugging_output_field}
                </div>

                <div className='row bg-light'>
                  {ocr_job_id_field}
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

                <div className='row bg-light'>
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
