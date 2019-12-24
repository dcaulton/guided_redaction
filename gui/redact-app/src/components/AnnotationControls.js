import React from 'react';

class AnnotationControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      active_template_id: '',
      active_template_anchor_id: '',
      ocr_string: '',
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

  setOcrString(the_string) {
    this.setState({
      ocr_string: the_string,
    })
  }

  setActiveTemplateAnchorId(the_id) {
    this.setState({
      active_template_anchor_id: the_id,
    })
  }

  buildTemplateDropdown() {
    const template_keys = Object.keys(this.props.templates)
    if (template_keys.length) {
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
    } else {
      return <span>(no templates found)</span>
    }
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

  doAnnotationSave(annotation_type='template') {
    if (annotation_type === 'template') {
      let annotation_data = this.buildAnnotationSaveTemplatePayload()
      this.props.saveAnnotation(
        annotation_data, 
        this.props.displayInsightsMessage('annotation was saved')
      )
    } else if (annotation_type === 'ocr') {
      let annotation_data = this.buildAnnotationSaveOcrPayload()
      this.props.saveAnnotation(
        annotation_data, 
        this.props.displayInsightsMessage('annotation was saved')
      )
    }
  }

  buildAnnotationSaveTemplatePayload() {
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
      type: 'template',
      template_id: the_template_id,
      template_anchor_id: the_anchor_id,
      data: payload,
    }
    return annotation_data
  }

  buildAnnotationSaveOcrPayload() {
    // TODO if needed, pull coords from InsightsPanel state to give a box
    let payload = {
      match_string: this.state.ocr_string,
    }
    let annotation_data = {
      type: 'ocr',
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
    let template_add_button = ''
    let template_delete_button = ''
    let template_interactive_add_button = ''
    if (Object.keys(this.props.templates).length) {
      template_add_button = (
        <button
            className='btn btn-primary m-2'
            onClick={() => this.doAnnotationSave('template')}
        >
          Add
        </button>
      )

      template_delete_button = (
        <button
            className='btn btn-primary m-2'
            onClick={() => this.doAnnotationDelete('all')}
        >
          Delete
        </button>
      )

      template_interactive_add_button = (
        <button
            className='btn btn-primary m-2'
            onClick={() => this.doStartInteractiveAdd()}
        >
          Interactive Add
        </button>
      )
    }
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
              
                <div className='row bg-light m-3 p-3 border border-primary'>
                  <div className='col'>
                    <div className='row'>
                      <h4>template</h4>
                    </div>
                    <div className='row'>
                      {template_picker}
                      {template_anchor_picker}
                      {template_add_button}
                      {template_delete_button}
                      {template_interactive_add_button}

                    </div>
                  </div>
                </div>

                <div className='row bg-light m-3 p-3 border border-primary'>
                  <div className='col'>
                    <div className='row'>
                      <h4>ocr</h4>
                    </div>
                    <div className='row'>

                      <div                                                            
                          className='d-inline ml-2 mt-2'                              
                      >                                                               
                          <input                                                      
                              id='annotate_ocr_string'
                              size='30'
                              title='annotate ocr string'
                              value={this.state.ocr_string}
                              onChange={(event) => this.setOcrString(event.target.value)}
                          />
                      </div> 

                      <button
                          className='btn btn-primary m-2'
                          onClick={() => this.doAnnotationSave('ocr')}
                      >
                        Add
                      </button>

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

export default AnnotationControls;
