import React from 'react';
import {
  makeHeaderRow,
  buildInlinePrimaryButton,
  buildLabelAndTextInput,
  buildAttributesAsRows,
  buildAttributesAddRow,
  buildTier1DeleteButton,
} from './SharedControls'

class PipelineControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      description: '',
      attributes: {},
      attribute_search_value: '',
      unsaved_changes: false,
    }
    this.afterPipelineSaved=this.afterPipelineSaved.bind(this)
    this.deletePipeline=this.deletePipeline.bind(this)
  }

  componentDidMount() {
    this.props.getPipelines()
  }

  getPipelineFromState() {
    const pipeline = {
      id: this.state.id,
      name: this.state.name,
      description: this.state.description,
      attributes: this.state.attributes
    }
    return pipeline
  }

  afterPipelineSaved(pipeline_response_obj) {
    if (Object.keys(pipeline_response_obj).includes('pipeline_id')) {
      const pipeline_id = pipeline_response_obj['pipeline_id']
      this.setLocalStateVar('id', pipeline_id)
      this.props.displayInsightsMessage('pipeline was successfully saved')
    }
  }

  doSave() {
    if (!this.state.name) {
      this.props.displayInsightsMessage('Cannot save a pipeline without a name')
      return
    }
    const pipeline_obj = this.getPipelineFromState()
    this.props.savePipelineToDatabase(
      pipeline_obj,
      this.afterPipelineSaved
    )
  }

  doRun() {
  console.log('running a pipeline')
  }

  deletePipeline(pipeline_id) {
    this.props.deletePipeline(
      pipeline_id,
      this.props.displayInsightsMessage('pipeline was deleted')
    )
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
    let build_pipelines = {}
    for (let i=0; i < this.props.pipelines.length; i++) {
      const pipeline = this.props.pipelines[i]
      build_pipelines[pipeline['id']] = pipeline
    }
    return buildTier1DeleteButton('pipeline', build_pipelines, this.deletePipeline)
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

  buildDescriptionField() {
    return buildLabelAndTextInput(
      this.state.description,
      'Description',
      'pipeline_description',
      'description',
      80,
      ((value)=>{this.setLocalStateVar('description', value)})
    )
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      'pipeline_attribute_name',
      'pipeline_attribute_value',
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

  doAddAttribute() {
    const value_ele = document.getElementById('pipeline_attribute_value')
    const name_ele = document.getElementById('pipeline_attribute_name')
    if (value_ele.value && name_ele.value) {
      this.setAttribute(name_ele.value, value_ele.value)
      name_ele.value = ''
      value_ele.value = ''
    }
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


  render() {
    if (!this.props.visibilityFlags['pipelines']) {
      return([])
    }
    const load_button = this.buildLoadButton()
    const save_button = this.buildSaveButton()
    const delete_button = this.buildDeleteButton()
    const run_button = this.buildRunButton()
    const name_field = this.buildNameField()
    const description_field = this.buildDescriptionField()
    const attributes_list = this.buildAttributesList()
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

              <div className='row mt-2'>
                {description_field}
              </div>

              <div className='row mt-2'>
                {attributes_list}
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
