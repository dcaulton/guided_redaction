import React from 'react';

class AnnotationControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      active_template_id: '',
      active_template_anchor_id: '',
    }
    this.doAnnotationSave=this.doAnnotationSave.bind(this)
  }

  doSleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

  setActiveTemplateId(the_id) {
    this.setState({
      active_template_id: the_id,
    })
  }

  setActiveTemplateAnchorId(the_id) {
    this.setState({
      active_template_anchor_id: the_id,
    })
  }

  buildTemplateDropdown() {
    const template_keys = Object.keys(this.props.templates)
    return(
      <select
        name='template_id'
        onChange={(event) => this.setActiveTemplateId(event.target.value)}
      >
      {template_keys.map((value, index) => {
        return (
          <option key={index} value={this.props.templates[value]['id']}>{this.props.templates[value]['name']}</option>
        )
      })}
      </select>
    )
  }

  buildTemplateAnchorDropdown() {
    if (!this.props.current_template_id) {
      return ''
    }
    const cur_template = this.props.templates[this.props.current_template_id]
    return(
      <select
        name='template_anchor_id'
        onChange={(event) => this.setActiveTemplateAnchorId(event.target.value)}
      >
        <option key='1919' value='all'>all</option>
        <option key='1920' value='any'>any</option>
      {cur_template['anchors'].map((value, index) => {
        return (
          <option key={index} value={value['id']}>{value['id']}</option>
        )
      })}
      </select>
    )
  }

  doAnnotationSave() {
    let annotation_data = this.buildAnnotationSavePayload()
    this.props.saveAnnotation(
      annotation_data, 
      this.props.displayInsightsMessage('annotation was saved')
    )
  }

  buildAnnotationSavePayload() {
    let the_template_id = this.state.active_template_id
    if (!the_template_id) {
      the_template_id = this.props.current_template_id
    }
    let the_anchor_id = 'all'
    if (this.state.active_template_anchor_id) {
      the_anchor_id = this.state.active_template_anchor_id
    }
    let payload = true
    if (this.props.getAnnotations()) {
      const anns = this.props.getAnnotations()
      if (anns['all'] && 
          Object.keys(anns).includes('all') && 
          Object.keys(anns['all']).includes('data') && 
          anns['all']['data']
      ) {
        payload = false
      }
    }
    let annotation_data = {
      template_id: the_template_id,
      template_anchor_id: the_anchor_id,
      data: payload,
    }
    return annotation_data
  }

  doAnnotationDelete(scope='all') {
    this.props.deleteAnnotation(
      scope, 
      this.props.displayInsightsMessage('annotation was deleted')
    )
  }

  doStartInteractiveAdd() {
    this.props.setKeyDownCallback(32, this.doAnnotationSave)
    this.props.handleSetMode('add_annotations_interactive')
    document.getElementById('movie_scrubber').focus()
  }

  render() {
    const template_picker = this.buildTemplateDropdown()
    const template_anchor_picker = this.buildTemplateAnchorDropdown()
    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-9 h3'
              > 
                annotate
              </div>
              <div className='col float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#annotations_body'
                    aria-controls='annotations_body'
                    data-toggle='collapse'
                    type='button'
                >
                  show/hide
                </button>
              </div>
            </div>

            <div 
                id='annotations_body' 
                className='row collapse'
            >
              <div id='annotations_main' className='col'>

                <div className='row bg-light m-3'>
                  <h4>templates</h4>
                  {template_picker}
                  {template_anchor_picker}

                  <button
                      className='btn btn-primary m-2'
                      onClick={() => this.doAnnotationSave()}
                  >
                    Add
                  </button>

                  <button
                      className='btn btn-primary m-2'
                      onClick={() => this.doAnnotationDelete('all')}
                  >
                    Delete
                  </button>

                  <button
                      className='btn btn-primary m-2'
                      onClick={() => this.doStartInteractiveAdd()}
                  >
                    Interactive Add
                  </button>

                </div>
              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default AnnotationControls;
