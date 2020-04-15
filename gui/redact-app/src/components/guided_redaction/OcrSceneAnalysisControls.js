import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'                     
import {
  makeHeaderRow,
} from './SharedControls'

class OcrSceneAnalysisControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      unsaved_changes: false,
    }
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
                  <button>
                  press me
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default OcrSceneAnalysisControls;
