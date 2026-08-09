import re
import os

filepath = 'src/pages/dashboard/videos.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Remove vidstack imports
content = re.sub(r'// Import Vidstack components.*?interface VideoTutorial \{', 'interface VideoTutorial {', content, flags=re.DOTALL)

# 2. Replace states
new_states = """  // WebPlayer Script State
  const [webPlayerScript, setWebPlayerScript] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings/developer');
        if (res.ok) {
          const data = await res.json();
          if (data.webPlayerScript) {
            setWebPlayerScript(data.webPlayerScript);
          }
        }
      } catch (err) {
        console.error('Error fetching global settings:', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (webPlayerScript) {
      const match = webPlayerScript.match(/src=['"]([^'"]+)['"]/);
      if (match) {
        const script = document.createElement('script');
        script.src = match[1];
        script.defer = true;
        document.body.appendChild(script);
        return () => {
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
        };
      } else {
        const div = document.createElement('div');
        div.innerHTML = webPlayerScript;
        const scriptEls = div.querySelectorAll('script');
        const addedScripts = [];
        scriptEls.forEach(s => {
            const newScript = document.createElement('script');
            Array.from(s.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.text = s.innerHTML;
            document.body.appendChild(newScript);
            addedScripts.push(newScript);
        });
        return () => {
            addedScripts.forEach(s => {
                if(document.body.contains(s)) document.body.removeChild(s);
            });
        };
      }
    }
  }, [webPlayerScript]);

  // Form / Modal States for Admin/Developer"""

content = re.sub(r'// Player Drawer States.*?// Form / Modal States for Admin/Developer', new_states, content, flags=re.DOTALL)

# 3. Remove handlePlayVideo
content = re.sub(r'const handlePlayVideo = \(video: VideoTutorial\) => \{.*?setIsCollapsedDown\(false\);\s*\};', '', content, flags=re.DOTALL)

# 4. Wrap Card
content = re.sub(r'<Card\s+className="h-100 border-0 shadow-sm overflow-hidden video-card"[\s\S]*?onClick=\{\(\) => handlePlayVideo\(video\)\}\s*>', 
                 r"""<a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }} className="d-block h-100 video-card-link">
                <Card
                  className="h-100 border-0 shadow-sm overflow-hidden video-card"
                  style={{
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'pointer'
                  }}
                >""", content)

content = content.replace('</Card>\n              </Col>', '</Card></a>\n              </Col>')

# 5. Remove drawer UI
content = re.sub(r'\{\/\* ABSONS WebPlayer Bottom-Right Panel \*\/\}[\s\S]*?<\/style>', '', content)

with open(filepath, 'w') as f:
    f.write(content)

print("Rewrite done")
