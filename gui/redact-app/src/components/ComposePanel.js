import React from 'react'

class ComposePanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      thing: '',
    }
//    this.newImage=this.newImage.bind(this)
  }

  render() {
    return (
      <div id='compose_panel_container'>
        <div id='conpose_panel'>

          <div id='compose_header' className='row'>
            <div className='col'>
            header
            </div>
          </div>

          <div id='compose_movie_scrubber' className='row'>
            <div className='col'>
            movie scrubber
            </div>
          </div>

          <div id='compose_movie_footer' className='row'>
            <div className='col'>
            movie footer
            </div>
          </div>

          <div id='sequence_area' className='row'>
          sequence
          </div>
         
        </div>
      </div>
    );
  }
}

export default ComposePanel;
