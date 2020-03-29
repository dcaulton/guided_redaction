import React from 'react';
import {
  makeHeaderRow,
  buildInlinePrimaryButton,
  buildLabelAndTextInput,
} from './SharedControls'

class PipelineControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      attributes: {},
      attribute_search_value: '',
      first_click_coords: [],
      unsaved_changes: false,
    }
//    this.getOcrWindow=this.getOcrWindow.bind(this)
  }

  doSave() {
  console.log('saving a pipeline')
  }

  doRun() {
  console.log('running a pipeline')
  }

  deletePipeline(pipeline_id) {
  console.log('deleting a pipeline')
  }

  loadPipeline(pipeline_id) {
  console.log('loading a pipeline')
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: true,
    },
    when_done())
  }

  buildLoadButton() {
    return buildInlinePrimaryButton(
      'Load',
      (()=>{this.loadPipeline()})
    )
  }

  buildDeleteButton() {
    return buildInlinePrimaryButton(
      'Delete',
      (()=>{this.deletePipeline()})
    )
  }

  buildSaveButton() {
    return buildInlinePrimaryButton(
      'Save',
      (()=>{this.doSave()})
    )
  }

  buildRunButton() {
    return buildInlinePrimaryButton(
      'Run',
      (()=>{this.doRun()})
    )
  }
  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'pipeline_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  render() {
    if (!this.props.visibilityFlags['pipelines']) {
      return([])
    }
    const load_button = this.buildLoadButton()
    const save_button = this.buildSaveButton()
    const delete_button = this.buildDeleteButton()
    const run_button = this.buildRunButton()
    const name_field = this.buildNameField()
    const header_row = makeHeaderRow(
      'pipelines',
      'pipelines_body',
    )
    const sequence_header_row = makeHeaderRow(
      'sequence',
      'pipelines_sequence_body'
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='pipelines_body' 
                className='row collapse'
            >
              <div id='pipelines_main' className='col'>

                <div className='row'>
                  {load_button}
                  {save_button}
                  {delete_button}
                  {run_button}
                </div>

                <div className='row mt-2'>
                  {name_field}
                </div>

                <div className='row'>
                  <div className='col'>
                    {sequence_header_row}
                    <div id='pipelines_sequence_body' className='row collapse'>
                    bippity bop
                    </div>

                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default PipelineControls;
