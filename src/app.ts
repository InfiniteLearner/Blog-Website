import express, {Express, Request, Response} from "express";
import _ from 'lodash';
import mongoose, { CallbackError, Document, Schema, connect, model } from "mongoose";
import * as dotenv from "dotenv";

/* Connection to db setup */

mongoose.set("strictQuery", false);
dotenv.config();
const user:string = encodeURIComponent(process.env.DB_USER!) ;
const password:string = encodeURIComponent(process.env.DB_PASSWORD!) ;
const cluster:string = process.env.CLUSTER! ;
const db:string = process.env.DB! ;

const uri = `mongodb+srv://${user}:${password}@${cluster}/${db}?retryWrites=true&w=majority`;

/*--------------------------*/

/* Db content */

interface IPost {
  title: string,
  content: string
}

const postSchema : Schema = new Schema<IPost>({
  title: {
    type: String,
    required: [true, "The post should have a title"]
  },
  content: {
    type: String,
    required: [true, "The post should have some content"]
  }
},
{
  collation: {locale: "en", strength:2}
});

const Post = model<IPost>("Post", postSchema);

const homeStartingContent = new Post({
  title: "Home",
  content: "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing."
});

const aboutContent = new Post({
  title: "About",
  content: "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui."
});

const contactContent = new Post({
  title: "Contact",
  content: "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero."
})

const defaultPosts: IPost[]= [homeStartingContent, aboutContent, contactContent];


interface ISection{
  name: string,
  posts: IPost[]
}

const sectionSchema: Schema<ISection> = new Schema({
  name: {
    type: String,
    required: [true, "The section needs a name"]
  },
  posts: [postSchema]
},
{
  collation: {locale: "en", strength:2}
});

const Section = model<ISection>("Section", sectionSchema);

const homeSection = new Section({
  name: "Home",
  posts: [homeStartingContent]
});

const aboutSection = new Section({
  name: "About",
  posts: [aboutContent]
});

const contactSection = new Section({
  name: "Contact",
  posts: [contactContent]
});

const defaultSections : ISection[] = [homeSection, aboutSection, contactSection];

/*--------------------------*/

/* Set up express */

const app : Express = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

/*---------------------------*/


async function run(){

  /* Launching */

  await connect(uri);
  console.log("Connected to database");

  app.listen(3000, function() {
    console.log("Server started on port 3000");
  });

  //Save the default posts in the database if not present
  console.log("Saving default posts");
  Post.find({}, (err: CallbackError, posts: IPost[]) => {
    const defaultsPostsPresent: boolean = (defaultPosts.length <= posts.length) ;

    
    if(err){
      console.log(err);
      throw err ;
    }else if(!defaultsPostsPresent){
      Post.insertMany(defaultPosts, (err: CallbackError, newPosts: IPost[]) => {

        const postsEqual : boolean = (defaultPosts.length === newPosts.length) && (defaultPosts.every(element => newPosts.includes(element)))
        
        if(err){
          console.log(err);
          throw err ;
        }else if(postsEqual){
          console.log("The default posts have been saved in the database.");
        }else{
          throw new Error("The default posts couldn't been saved in the database.");
        }
      })
    }
  })

  console.log("Saving default sections");
  //Save the default sections if not present
  Section.find({}, (err: CallbackError, sections: ISection[]) => {
    const defaultSectionsPresent = defaultSections.length <= sections.length ;

    if(err){
      console.log(err);
      throw err ;
    }else if(!defaultSectionsPresent){
      Section.insertMany(defaultSections, (err: CallbackError, newSections: Document<unknown, any, ISection>[] & ISection[]) => {

        const sectionsEqual : boolean = (defaultSections.length === newSections.length) && (defaultSections.every(element => newSections.includes(element)))

        if(err){
          console.log(err);
          throw err;
        }else if(sectionsEqual){
          console.log("The default sections have been saved in the database");
        }else{
          throw new Error("The default sections couldn't been saved in the database.");
        }
      })
    }
  });



  /*------------------*/

  /* GET roads */

  app.get("/", (req: Request, res: Response) => {

    const sectionName: string = "home" ;

    findSectionAndRender(sectionName, res);
  })
  
  app.get("/about", (req: Request, res: Response) => {
    const sectionName: string = "about";

    findSectionAndRender(sectionName, res);
  })
  
  app.get("/contact", (req: Request, res: Response) => {
    const sectionName: string = "contact";

    findSectionAndRender(sectionName, res);
  });
  
  app.get("/compose", (req: Request, res: Response) => {
    res.render("compose");
  })
  
  app.get("/posts/:title", (req: Request, res: Response) => {
    let title: string = req.params.title ;
  
    Post.findOne({title: title}, (err: CallbackError, post: IPost) => {
      if(err){
        console.log(err);
        throw err ;
      }else if(!post){
        throw new Error("No post with this title has been found : " + title);
      }else{
        res.render("post", {post: post});
      }
    });

  })

  /*-------------------------------------------*/
  
  /* POST roads */
  
  app.post("/compose", (req: Request, res: Response) => {
    const newPost : Document<unknown, any, IPost> & IPost = new Post({
      title : req.body.postTitle,
      content : req.body.postContent
    });

    const sectionName = "home" ;
  
    newPost.save((err: CallbackError, post: Document<unknown, any, IPost> & IPost) => {
      if(err){
        console.log(err);
        throw err ;
      }else if(newPost !== post){
        throw new Error("The new post could not be saved");
      }else{
        Section.findOneAndUpdate({name: sectionName}, {$push: {posts: post}}, (err: CallbackError, section: ISection) => {
          if(err){
            console.log(err);
            throw err ;
          }else if(!section){
            throw new Error(`No section with the name ${sectionName} has been found`)
          }else{
            console.log("List has been updated");
            res.redirect("/");
          }
        })
      }
    })
  
  })
  
  /*--------------------------------------------*/
  
  
}

/* Helper functions */

function findSectionAndRender(sectionName: string, res: Response){
  Section.findOne({name : sectionName}, (err: CallbackError, section: Document<unknown, any, ISection> & ISection) => {
    if(err){
      console.log(err);
      throw err ;
    }else if(!section){
      throw new Error(`The section ${sectionName} has not been found`);
    }else{
      res.render(sectionName, {posts : section.posts});
    }
  })
}

/*---------------------*/

run().catch(err => console.log(err));