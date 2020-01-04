import React from 'react';
import TemplateControls from './TemplateControls'
import AnnotationControls from './AnnotationControls'
import SelectedAreaControls from './SelectedAreaControls'
import OcrControls from './OcrControls'
import MovieSetsPanel from './MovieSetsPanel'
import ResultsPanel from './ResultsPanel'
import SessionControls from './SessionControls'

class BottomInsightsControls extends React.Component {

  render() {
    let bottom_y = 100
    const ele = document.getElementById('insights_image_div')
    if (ele) {
      bottom_y += ele.offsetHeight
    }
    const controls_style = {
      top: bottom_y,
    }

    return (
      <div 
          id='bottom_insights_controls' 
          className='fixed-bottom'
          style={controls_style}
      >

        <TemplateControls 
          handleSetMode={this.props.handleSetMode}
          clearCurrentTemplateAnchor={this.props.clearCurrentTemplateAnchor}
          clearCurrentTemplateMaskZones={this.props.clearCurrentTemplateMaskZones}
          scanTemplate={this.props.scanTemplate}
          submitInsightsJob={this.props.submitInsightsJob}
          clearTemplateMatches={this.props.clearTemplateMatches}
          templates={this.props.templates}
          current_template_id={this.props.current_template_id}
          displayInsightsMessage={this.props.displayInsightsMessage}
          setCurrentTemplateId={this.props.setCurrentTemplateId}
          saveTemplate={this.props.saveTemplate}
          deleteTemplate={this.props.deleteTemplate}
          cropImage={this.props.cropImage}
          movie_sets={this.props.movie_sets}
          showTemplates={this.props.showTemplates}
          toggleShowTemplates={this.props.toggleShowTemplates}
        />

        <SelectedAreaControls
          handleSetMode={this.props.handleSetMode}
          getCurrentTemplateAnchorNames={this.props.getCurrentTemplateAnchorNames}
          clearMovieSelectedAreas={this.props.clearMovieSelectedAreas}
          setSelectedAreaTemplateAnchor={this.props.setSelectedAreaTemplateAnchor}
          getCurrentSelectedAreaMeta={this.props.getCurrentSelectedAreaMeta}
          showSelectedArea={this.props.showSelectedArea}
          toggleShowSelectedArea={this.props.toggleShowSelectedArea}
        />

        <AnnotationControls
          templates={this.props.templates}
          current_template_id={this.props.current_template_id}
          displayInsightsMessage={this.props.displayInsightsMessage}
          saveAnnotation={this.props.saveAnnotation}
          deleteAnnotation={this.props.deleteAnnotation}
          annotations={this.props.annotations}
          handleSetMode={this.props.handleSetMode}
          setKeyDownCallback={this.props.setKeyDownCallback}
          getAnnotations={this.props.getAnnotations}
          showAnnotate={this.props.showAnnotate}
          toggleShowAnnotate={this.props.toggleShowAnnotate}
        />

        <OcrControls
          displayInsightsMessage={this.props.displayInsightsMessage}
          showOcr={this.props.showOcr}
          toggleShowOcr={this.props.toggleShowOcr}
        />

        <MovieSetsPanel
          displayInsightsMessage={this.props.displayInsightsMessage}
          movie_sets={this.props.movie_sets}
          setMovieSets={this.props.setMovieSets}
          draggedId={this.props.draggedId}
          showMovieSets={this.props.showMovieSets}
          toggleShowMovieSets={this.props.toggleShowMovieSets}
        />

        <ResultsPanel
          displayInsightsMessage={this.props.displayInsightsMessage}
          showResults={this.props.showResults}
          toggleShowResults={this.props.toggleShowResults}
        />

        <SessionControls
          current_workbook_name={this.props.current_workbook_name}
          saveWorkbook={this.props.saveWorkbook}
          saveWorkbookName={this.props.saveWorkbookName}
          displayInsightsMessage={this.props.displayInsightsMessage}
          callPing={this.props.callPing}
          workbooks={this.props.workbooks}
          deleteWorkbook={this.props.deleteWorkbook}
          loadWorkbook={this.props.loadWorkbook}
          showTemplates={this.props.showTemplates}
          showSelectedArea={this.props.showSelectedArea}
          showMovieSets={this.props.showMovieSets}
          showResults={this.props.showResults}
          showAnnotate={this.props.showAnnotate}
          showOcr={this.props.showOcr}
          toggleShowTemplates={this.props.toggleShowTemplates}
          toggleShowSelectedArea={this.props.toggleShowSelectedArea}
          toggleShowMovieSets={this.props.toggleShowMovieSets}
          toggleShowResults={this.props.toggleShowResults}
          toggleShowAnnotate={this.props.toggleShowAnnotate}
          toggleShowOcr={this.props.toggleShowOcr}
          setFramesetDiscriminator={this.props.setFramesetDiscriminator}
          campaign_movies={this.props.campaign_movies}
          setCampaignMovies={this.props.setCampaignMovies}
          updateGlobalState={this.props.updateGlobalState}
        />

      </div>
    )
  }
}

export default BottomInsightsControls;
