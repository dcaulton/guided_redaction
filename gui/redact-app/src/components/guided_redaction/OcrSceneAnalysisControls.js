import React from 'react';
import {
  makeHeaderRow,
  buildInlinePrimaryButton,
  doTier1Save,
  buildLabelAndTextInput,
} from './SharedControls'

class OcrSceneAnalysisControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      apps: [],
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
      apps: this.state.apps,
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
      'ocr_scene_analysis',
      'ocr_scene_analysis',
      this.setLocalStateVarNoWarning,
      this.props.setGlobalStateVar,
      when_done,
    )
  }

  async doSaveToDatabase() {
    this.doSave(((ocr_rule) => {
      this.props.saveScannerToDatabase(
        'ocr_rule',
        ocr_rule,
        (()=>{this.props.displayInsightsMessage('Ocr Rule has been saved to database')})
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

  render() {
    if (!this.props.visibilityFlags['ocr_scene_analysis']) {
      return([])
    }
    const header_row = makeHeaderRow(
      'ocr scene analysis',
      'ocr_scene_analysis_body',
      (() => this.props.toggleShowVisibility('ocr_scene_analysis'))
    )
    const save_button = this.buildSaveButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const name_field = this.buildNameField()


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
                  {save_button}
                  {save_to_db_button}
                  <button>
                  press me
                  </button>
                </div>

                <div className='row bg-light'>
                  {name_field}
                </div>
              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default OcrSceneAnalysisControls;
