import React from 'react';

class JobEvalPanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      mode: '',
      annotate_view_mode: 'tile',
      jeo_id: '',
      jeo_description: '',
      jeo_exemplar_movies: {},
      job_eval_objectives: {},
      job_run_summaries: {},
    }
  }

  buildHomePanel() {
    const mode_nav = this.buildModeNav()
    return (
      <div className='col ml-4 mt-4'>
        <div className='row h2'>
          Job Eval - Pick a task
        </div>
        <div>
          {mode_nav}
        </div>
      </div>
    )
  }

  buildModeNav() {
    let targets = []
    if (this.state.mode && this.state.mode === 'annotate') {
      targets = [{'': 'home'}, 
                 {'review': 'review non-exemplar job'}, 
                 {'compare': 'compare jobs'}
      ]
    } else if (this.state.mode && this.state.mode === 'review') {
      targets = [{'': 'home'}, 
                 {'annotate': 'annotate exemplar movie'}, 
                 {'compare': 'compare jobs'}
      ]
    } else if (this.state.mode && this.state.mode === 'compare') {
      targets = [{'': 'home'}, 
                 {'annotate': 'annotate exemplar movie'}, 
                 {'review': 'review non-exemplar job'}
      ]
    } else {
      targets = [{'annotate': 'annotate exemplar movie'}, 
                 {'review': 'review non-exemplar job'},
                 {'compare': 'compare jobs'}
      ]
    }
    if (targets.length > 0) {
      return (
        <div className='row'>
          {targets.map((target_obj, index) => {
            const target_key = Object.keys(target_obj)[0]
            const target_display_text = target_obj[target_key]
            return (
              <div className='col-3' key={index}>
                <div className='row'>
                <button
                  className='btn btn-link'
                  onClick={() => {this.setState({'mode': target_key})}}
                >
                  {target_display_text}
                </button>
                </div>
              </div>
            )
          })}
        </div>
      )
    }
  }

  buildAnnotatePanel() {
    const mode_nav = this.buildModeNav()
    return (
      <div className='col ml-2'>
        <div>
          {mode_nav}
        </div>
        <div className='row h2'>
          Job Eval - Annotate
        </div>
        <div className='row'>
          
        </div>
      </div>
    )
  }

  render() {
    if (!this.state.mode) {
      return this.buildHomePanel()
    } else if (this.state.mode === 'annotate') {
      return this.buildAnnotatePanel()
    }
  }
}

export default JobEvalPanel;
