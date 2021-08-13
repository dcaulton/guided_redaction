import React from 'react';

class FramesetCard extends React.Component {

  buildFramesetHashData(the_hash) {
    const the_length = the_hash.length
    let short_hash = the_hash
    if (the_length > 12) {
      short_hash = the_hash.substring(0, 2) + '...' +
        the_hash.substring(the_length-2)
    }
    const hash_data = (
      <span title={the_hash}>
        {short_hash}
      </span>
    )
    return hash_data
  }

  buildEditedIndicator(image_url) {
    if (image_url.includes('redacted')) {
      return 'edited'
    }
  }

  render() {
    const hash_span = this.buildFramesetHashData(this.props.frame_hash)
    let top_div_classname = 'col-md-3 frameCard m-3 p-3 bg-light'
    if (this.props.frame_hash === this.props.active_frameset_hash) {
      top_div_classname = 'col-md-3 frameCard m-3 p-3 active_card'
    }
    let display_image = this.props.getImageFromFrameset(this.props.frame_hash)
    const edited_indicator = this.buildEditedIndicator(display_image)
    return (
      <div 
          id={this.props.frame_hash}
          className={top_div_classname}
          draggable='true'
          onDragStart={() => this.props.setDraggedId(this.props.frame_hash)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => this.props.handleDroppedFrameset(this.props.frame_hash)}
      >
        <div className='frameset_hash'>
          {hash_span}
        </div>

        <img 
            className='zoomable-image'
            src={display_image}
            alt={display_image}
        />

        <div className='card-body'>
          <div className='card-text'>{this.props.image_names.length} images</div>
        </div>

        <div>
          <div className='d-inline'>
            {edited_indicator}
          </div>
          <div className='d-inline ml-2'>
            <button
              className='btn btn-primary'
              onClick={() => this.props.gotoFramesetHash(this.props.frame_hash)}
            >
              Goto 
            </button>
          </div>
          <div className='d-inline ml-2'>
            <button
              className='btn btn-primary'
              onClick={() => this.props.removeFramesetHash(this.props.frame_hash)}
            >
              Delete
            </button>
          </div>
          <div className='d-inline ml-2'>
            <button
              className='btn btn-primary'
              onClick={() => this.props.truncateAtFramesetHash(this.props.frame_hash)}
            >
              Delete to Movie End
            </button>
          </div>
        </div>


      </div>
    )
  }
}

class FramesetCardList extends React.Component {
  getImageNamesList(image_list) {
    let name_elements = Object.keys(image_list).map((img_name) =>
      <p
        key={Math.random() * 10**9}
      >
        {this.props.getNameFor(image_list[img_name])}
      </p>
    );
    return name_elements
  }

  buildFramesetCards(ordered_frame_hashes, framesets) {
    if (!this.props.show_story_board) {
      return ''
    }
    return (
      <div id='cards_row' className='row m-2'>
        <div className='col-12 h4 m-2 font-italic'>
          drag and drop to merge frames
        </div>

        {ordered_frame_hashes.map((key, index) => {
          return (
            <FramesetCard
              setDraggedId={this.props.setDraggedId}
              handleDroppedFrameset={this.props.handleDroppedFrameset}
              frame_hash={key}
              image_names={this.getImageNamesList(framesets[key]['images'])}
              key={key}
              redactFramesetCallback={this.props.redactFramesetCallback}
              getImageFromFrameset={this.props.getImageFromFrameset}
              getRedactedImageFromFrameset={this.props.getRedactedImageFromFrameset}
              active_frameset_hash={this.props.active_frameset_hash}
              gotoFramesetHash={this.props.gotoFramesetHash}
              removeFramesetHash={this.props.removeFramesetHash}
              truncateAtFramesetHash={this.props.truncateAtFramesetHash}
            />
          )
        })}
      </div>
    )
  }

  render() {
    let show_sb_checked = ''
    if (this.props.show_story_board) {
      show_sb_checked = 'checked'
    }

    const framesets = this.props.getCurrentFramesets()
    let ordered_frame_hashes = this.props.getFramesetHashesInOrder()
    if (ordered_frame_hashes.length === 0) {
      return ''
    }
    const frameset_cards = this.buildFramesetCards(ordered_frame_hashes, framesets)
    return (
      <div 
        id='frameset_cards' 
        className='col border'
      >
        <div className='row pt-2 pb-2'>
          <div
            className='col-10 h3 float-left'
          >
            Story Board
          </div>
          <div 
              className='d-inline float-right'
          >
            <input
              className='ml-2 mr-2 mt-1'
              checked={show_sb_checked}
              type='checkbox'
              onChange={() => this.props.toggleShowStoryBoardVisibility()}
            />
          </div>
        </div>

        {frameset_cards}
      </div>
    )
  }
}

export default FramesetCardList;
